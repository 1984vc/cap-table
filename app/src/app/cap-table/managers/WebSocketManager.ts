export interface WebSocketMessage {
  type: string;
  worksheetId?: string;
  version?: number;
  lastModified?: string;
  data?: unknown;
  timestamp?: number;
}

export interface WebSocketConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  connectedAt: Date | null;
  lastError: string | null;
  reconnectAttempts: number;
}

export interface WebSocketManagerEvents {
  onStateChange: (state: WebSocketConnectionState) => void;
  onMessage: (message: WebSocketMessage) => void;
  onError: (error: string) => void;
}

interface WebSocketConnection {
  ws: WebSocket;
  url: string;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  isReconnecting: boolean;
  heartbeatInterval?: number;
  lastPongReceived: number;
  shouldReconnect: boolean;
  isIdle: boolean;
  lastActivity: number;
  heartbeatFailures: number;
}

export class WebSocketManager {
  private connection: WebSocketConnection | null = null;
  private events: WebSocketManagerEvents;
  private connectionState: WebSocketConnectionState;
  private debugMode: boolean = false;
  
  private readonly HEARTBEAT_INTERVAL = 5_000; // 5 seconds (for testing)
  private readonly HEARTBEAT_TIMEOUT = 3_000; // 3 seconds (for testing)
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly INITIAL_RECONNECT_DELAY = 1000; // 1 second
  private readonly IDLE_TIMEOUT = 10_000; // 10 seconds of inactivity before going idle (for testing)
  private readonly IDLE_DISCONNECT_TIMEOUT = 20_000; // 20 seconds idle before disconnect (for testing)
  private readonly HEARTBEAT_RETRY_COUNT = 2; // Number of heartbeat failures before disconnecting (reduced for testing)

  constructor(events: WebSocketManagerEvents, debugMode: boolean = false) {
    this.events = events;
    this.debugMode = debugMode;
    this.connectionState = {
      status: 'disconnected',
      connectedAt: null,
      lastError: null,
      reconnectAttempts: 0
    };

    // Listen for visibility changes to handle tab switching
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  getDebugMode(): boolean {
    return this.debugMode;
  }

  connect(wsUrl: string): void {
    if (this.connection?.ws.readyState === WebSocket.OPEN || this.connection?.ws.readyState === WebSocket.CONNECTING) {
      console.log(`♻️ Reusing existing WebSocket connection`);
      return;
    }

    this.cleanup();
    this.updateConnectionState({ status: 'connecting' });

    const connection: WebSocketConnection = {
      ws: new WebSocket(wsUrl),
      url: wsUrl,
      reconnectAttempts: 0,
      maxReconnectAttempts: this.MAX_RECONNECT_ATTEMPTS,
      reconnectDelay: this.INITIAL_RECONNECT_DELAY,
      isReconnecting: false,
      lastPongReceived: Date.now(),
      shouldReconnect: true,
      isIdle: false,
      lastActivity: Date.now(),
      heartbeatFailures: 0
    };

    this.setupWebSocketHandlers(connection);
    this.connection = connection;
    
    console.log(`🔗 Connecting WebSocket to:`, wsUrl);
  }

  disconnect(): void {
    if (this.connection) {
      this.connection.shouldReconnect = false;
      this.stopHeartbeat();
      if (this.connection.ws.readyState === WebSocket.OPEN || this.connection.ws.readyState === WebSocket.CONNECTING) {
        this.connection.ws.close(1000, 'Manual disconnect');
      }
      this.connection = null;
    }
    this.updateConnectionState({ status: 'disconnected', connectedAt: null });
  }

  markActive(): void {
    if (this.connection) {
      this.connection.lastActivity = Date.now();
      
      // Always check if we need to reconnect, not just when idle
      if (this.connection.ws.readyState === WebSocket.CLOSED || 
          this.connection.ws.readyState === WebSocket.CLOSING) {
        console.log(`🔄 Connection closed, attempting reconnect on user activity`);
        this.attemptReconnect();
      } else if (this.connection.isIdle) {
        console.log(`🔄 Connection becoming active from idle`);
        this.connection.isIdle = false;
      }
    }
  }

  ensureConnected(): void {
    if (!this.connection) return;
    
    const state = this.connection.ws.readyState;
    if (state !== WebSocket.OPEN && state !== WebSocket.CONNECTING) {
      console.log(`🔍 Connection not healthy (state: ${state}), reconnecting...`);
      this.attemptReconnect();
    }
  }

  getConnectionState(): WebSocketConnectionState {
    return { ...this.connectionState };
  }

  private setupWebSocketHandlers(connection: WebSocketConnection): void {
    const { ws } = connection;

    ws.onopen = () => {
      console.group(`🔗 WebSocket Connected`);
      console.log(`🕐 Connected at:`, new Date().toISOString());
      console.log(`🌐 URL:`, connection.url);
      console.log(`🔗 Ready state:`, ws.readyState);
      console.log(`📡 Protocol:`, ws.protocol);
      console.groupEnd();

      // Reset reconnection state on successful connection
      connection.reconnectAttempts = 0;
      connection.reconnectDelay = this.INITIAL_RECONNECT_DELAY;
      connection.isReconnecting = false;
      connection.lastPongReceived = Date.now();
      connection.heartbeatFailures = 0;

      this.updateConnectionState({
        status: 'connected',
        connectedAt: new Date(),
        lastError: null,
        reconnectAttempts: 0
      });

      // Start heartbeat
      this.startHeartbeat();
    };

    ws.onmessage = (event) => {
      try {
        console.group(`📨 WebSocket Message Received`);
        console.log(`🕐 Timestamp:`, new Date().toISOString());
        console.log(`📄 Raw message:`, event.data);
        console.log(`📊 Message size:`, event.data.length, 'bytes');
        console.log(`🔗 WebSocket state:`, ws.readyState);
        
        const data: WebSocketMessage = JSON.parse(event.data);
        console.log(`📥 Parsed message:`, data);
        console.log(`🏷️ Message type:`, data.type);
        
        // Handle pong messages for heartbeat
        if (data.type === 'pong') {
          connection.lastPongReceived = Date.now();
          connection.heartbeatFailures = 0; // Reset failure count on successful pong
          console.log(`💓 Heartbeat pong received`);
          console.groupEnd();
          return;
        }
        
        if (data.worksheetId) {
          console.log(`📋 Worksheet ID:`, data.worksheetId);
        }
        if (data.version) {
          console.log(`🔢 Version:`, data.version);
        }
        if (data.lastModified) {
          console.log(`⏰ Last modified:`, data.lastModified);
        }
        
        console.groupEnd();
        this.events.onMessage(data);
      } catch (error) {
        console.group(`❌ WebSocket Message Parse Error`);
        console.error("Raw message:", event.data);
        console.error("Parse error:", error);
        console.groupEnd();
        this.events.onError(`Failed to parse WebSocket message: ${error}`);
      }
    };

    ws.onclose = (event) => {
      console.group(`🔌 WebSocket Disconnected`);
      console.log(`🕐 Disconnected at:`, new Date().toISOString());
      console.log(`🔢 Close code:`, event.code);
      console.log(`📝 Close reason:`, event.reason || 'No reason provided');
      console.log(`✅ Clean close:`, event.wasClean);
      console.log(`🔄 Should reconnect:`, connection.shouldReconnect);
      console.log(`🔢 Reconnect attempts:`, connection.reconnectAttempts);
      console.groupEnd();

      // Clear heartbeat
      this.stopHeartbeat();

      this.updateConnectionState({
        status: 'disconnected',
        connectedAt: null,
        reconnectAttempts: connection.reconnectAttempts
      });

      // Attempt reconnection if needed
      if (connection.shouldReconnect && connection.reconnectAttempts < connection.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else if (connection.reconnectAttempts >= connection.maxReconnectAttempts) {
        console.log(`❌ Max reconnection attempts reached, giving up`);
        this.updateConnectionState({ status: 'error', lastError: 'Max reconnection attempts reached' });
        this.events.onError('Max reconnection attempts reached');
      }
    };

    ws.onerror = (error) => {
      // Only log errors that aren't caused by immediate close (React StrictMode)
      if (ws.readyState !== WebSocket.CLOSED) {
        console.group(`❌ WebSocket Error`);
        console.log(`🕐 Error at:`, new Date().toISOString());
        console.log(`🔗 Ready state:`, ws.readyState);
        console.error(`💥 Error:`, error);
        console.groupEnd();

        this.updateConnectionState({ status: 'error', lastError: 'WebSocket connection error' });
        this.events.onError('WebSocket connection error');
      }
    };
  }

  private startHeartbeat(): void {
    if (!this.connection) return;

    // Clear any existing heartbeat
    this.stopHeartbeat();

    this.connection.heartbeatInterval = window.setInterval(() => {
      if (!this.connection) return;

      // Check idle state first
      this.checkIdleState();
      
      if (this.connection.ws.readyState === WebSocket.OPEN) {
        // Check if we received a pong recently
        const timeSinceLastPong = Date.now() - this.connection.lastPongReceived;
        if (timeSinceLastPong > this.HEARTBEAT_TIMEOUT) {
          this.connection.heartbeatFailures++;
          console.log(`💔 Heartbeat timeout (failure ${this.connection.heartbeatFailures}/${this.HEARTBEAT_RETRY_COUNT})`);
          
          if (this.connection.heartbeatFailures >= this.HEARTBEAT_RETRY_COUNT) {
            console.log(`💔 Max heartbeat failures reached, closing connection`);
            this.connection.ws.close(1000, 'Heartbeat timeout');
            return;
          }
        }

        // Only send ping if not idle
        if (!this.connection.isIdle) {
          try {
            this.connection.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            console.log(`💓 Heartbeat ping sent`);
          } catch (error) {
            console.error(`❌ Failed to send heartbeat ping:`, error);
          }
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.connection?.heartbeatInterval) {
      clearInterval(this.connection.heartbeatInterval);
      this.connection.heartbeatInterval = undefined;
    }
  }

  private checkIdleState(): void {
    if (!this.connection) return;

    const now = Date.now();
    const timeSinceActivity = now - this.connection.lastActivity;
    
    if (!this.connection.isIdle && timeSinceActivity > this.IDLE_TIMEOUT) {
      console.log(`😴 Connection going idle after ${timeSinceActivity}ms of inactivity`);
      this.connection.isIdle = true;
    }
    
    if (this.connection.isIdle && timeSinceActivity > this.IDLE_DISCONNECT_TIMEOUT) {
      console.log(`💤 Disconnecting idle connection after ${timeSinceActivity}ms of inactivity`);
      // Don't set shouldReconnect to false here - we want to reconnect on activity
      this.connection.ws.close(1000, 'Idle timeout');
    }
  }

  private attemptReconnect(): void {
    if (!this.connection || this.connection.isReconnecting) {
      return;
    }
    
    // Reset connection state for fresh reconnection
    this.connection.isReconnecting = true;
    this.connection.shouldReconnect = true;
    this.connection.isIdle = false;
    this.connection.reconnectAttempts = 0;
    this.connection.reconnectDelay = this.INITIAL_RECONNECT_DELAY;
    
    console.log(`🔄 Attempting to reconnect WebSocket`);
    
    // Create new WebSocket connection
    this.connection.ws = new WebSocket(this.connection.url);
    this.setupWebSocketHandlers(this.connection);
  }


  private scheduleReconnect(): void {
    if (!this.connection || this.connection.isReconnecting) {
      return; // Already reconnecting
    }

    this.connection.isReconnecting = true;
    this.connection.reconnectAttempts++;

    console.log(`🔄 Scheduling reconnect (attempt ${this.connection.reconnectAttempts}/${this.connection.maxReconnectAttempts}) in ${this.connection.reconnectDelay}ms`);

    this.updateConnectionState({
      status: 'connecting',
      reconnectAttempts: this.connection.reconnectAttempts
    });

    setTimeout(() => {
      if (!this.connection?.shouldReconnect) {
        return; // Connection was manually closed
      }

      console.log(`🔄 Attempting to reconnect...`);
      
      // Create new WebSocket with same URL
      this.connection.ws = new WebSocket(this.connection.url);
      this.setupWebSocketHandlers(this.connection);
      
      // Exponential backoff with jitter
      this.connection.reconnectDelay = Math.min(
        this.connection.reconnectDelay * 2 + Math.random() * 1000,
        30000 // Max 30 seconds
      );
    }, this.connection.reconnectDelay);
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      console.log('🔍 Tab became visible, checking WebSocket connection');
      
      // Mark as active when tab becomes visible
      this.markActive();
      
      // Check if WebSocket is still connected when tab becomes visible
      if (this.connection && this.connection.ws.readyState !== WebSocket.OPEN) {
        console.log('🔄 WebSocket disconnected while tab was hidden, attempting to reconnect');
        this.connection.shouldReconnect = true; // Ensure reconnection is enabled
        this.updateConnectionState({ status: 'connecting' });
        
        // Reset reconnection state for visibility-based reconnection
        this.connection.isReconnecting = true;
        this.connection.reconnectAttempts = 0;
        this.connection.reconnectDelay = this.INITIAL_RECONNECT_DELAY;
        
        // Reconnect WebSocket
        this.connection.ws = new WebSocket(this.connection.url);
        this.setupWebSocketHandlers(this.connection);
      }
    } else {
      console.log('🙈 Tab became hidden');
    }
  }

  private updateConnectionState(updates: Partial<WebSocketConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates };
    this.events.onStateChange(this.connectionState);
  }

  private cleanup(): void {
    if (this.connection) {
      this.connection.shouldReconnect = false;
      this.stopHeartbeat();
      if (this.connection.ws.readyState === WebSocket.OPEN || this.connection.ws.readyState === WebSocket.CONNECTING) {
        this.connection.ws.close(1000, 'Cleanup');
      }
    }
  }

  destroy(): void {
    this.cleanup();
    this.connection = null;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }
}
