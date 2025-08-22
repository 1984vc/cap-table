import { IConversionStateData } from "@/cap-table/state/ConversionState";

const getBackendUrl = () => {
  // Priority 1: Explicit VITE_BACKEND_URL (highest priority)
  if (import.meta.env.VITE_BACKEND_URL) {
    console.log(`🔗 Using explicit backend URL: ${import.meta.env.VITE_BACKEND_URL}`);
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  // Priority 2: Environment-specific URLs
  if (import.meta.env.VITE_STAGING_BACKEND_URL && import.meta.env.VITE_ENVIRONMENT === 'staging') {
    console.log(`🔗 Using staging backend URL: ${import.meta.env.VITE_STAGING_BACKEND_URL}`);
    return import.meta.env.VITE_STAGING_BACKEND_URL;
  }
  
  if (import.meta.env.VITE_PRODUCTION_BACKEND_URL && import.meta.env.VITE_ENVIRONMENT === 'production') {
    console.log(`🔗 Using production backend URL: ${import.meta.env.VITE_PRODUCTION_BACKEND_URL}`);
    return import.meta.env.VITE_PRODUCTION_BACKEND_URL;
  }
  
  // Priority 3: Development mode detection
  if (import.meta.env.DEV) {
    // In development mode, check if we want to use local worker
    const url = import.meta.env.VITE_USE_LOCAL_WORKER === 'true' 
      ? 'http://localhost:8787' 
      : 'https://1984-startup-finance-worker.mdp-005.workers.dev';
    console.log(`🔗 Using development backend URL: ${url}`);
    return url;
  }
  
  // Priority 4: Default production worker
  const defaultUrl = 'https://1984-startup-finance-worker.mdp-005.workers.dev';
  console.log(`🔗 Using default backend URL: ${defaultUrl}`);
  return defaultUrl;
};

const BACKEND_URL = getBackendUrl();

export interface BackendResponse {
  data: IConversionStateData;
  version: number;
  lastModified: string;
}

interface WebSocketConnection {
  ws: WebSocket;
  url: string;
  onMessage: (message: unknown) => void;
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

export class BackendService {
  private static instance: BackendService;
  private websockets: Map<string, WebSocketConnection> = new Map();
  private readonly HEARTBEAT_INTERVAL = 10000; // 10 seconds (match WebSocketManager)
  private readonly HEARTBEAT_TIMEOUT = 5000; // 5 seconds (match WebSocketManager)
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly INITIAL_RECONNECT_DELAY = 1000; // 1 second
  private readonly IDLE_TIMEOUT = 30000; // 30 seconds (match WebSocketManager)
  private readonly IDLE_DISCONNECT_TIMEOUT = 60000; // 1 minute (match WebSocketManager)
  private readonly HEARTBEAT_RETRY_COUNT = 3; // Number of heartbeat failures before disconnecting

  static getInstance(): BackendService {
    if (!BackendService.instance) {
      BackendService.instance = new BackendService();
    }
    return BackendService.instance;
  }

  // Mark connection as active (called on user interaction or data changes)
  markConnectionActive(id: string): void {
    const connection = this.websockets.get(id);
    if (connection) {
      connection.lastActivity = Date.now();
      if (connection.isIdle) {
        console.log(`🔄 Connection ${id} becoming active, attempting reconnect if needed`);
        connection.isIdle = false;
        
        // If connection is closed, reconnect
        if (connection.ws.readyState === WebSocket.CLOSED) {
          this.reconnectFromIdle(id, connection);
        }
      }
    }
  }

  // Check if connection should go idle and disconnect if needed
  private checkIdleState(id: string, connection: WebSocketConnection): void {
    const now = Date.now();
    const timeSinceActivity = now - connection.lastActivity;
    
    if (!connection.isIdle && timeSinceActivity > this.IDLE_TIMEOUT) {
      console.log(`😴 Connection ${id} going idle after ${timeSinceActivity}ms of inactivity`);
      connection.isIdle = true;
    }
    
    if (connection.isIdle && timeSinceActivity > this.IDLE_DISCONNECT_TIMEOUT) {
      console.log(`💤 Disconnecting idle connection ${id} after ${timeSinceActivity}ms of inactivity`);
      connection.shouldReconnect = false; // Don't auto-reconnect idle connections
      connection.ws.close(1000, 'Idle timeout');
    }
  }

  // Reconnect from idle state
  private reconnectFromIdle(id: string, connection: WebSocketConnection): void {
    if (connection.isReconnecting) {
      return; // Already reconnecting
    }

    console.log(`🔄 Reconnecting from idle state for ${id}`);
    connection.isReconnecting = true;
    connection.shouldReconnect = true;
    connection.reconnectAttempts = 0; // Reset attempts for idle reconnection
    connection.reconnectDelay = this.INITIAL_RECONNECT_DELAY;

    // Create new WebSocket
    connection.ws = new WebSocket(connection.url);
    this.setupWebSocketHandlers(id, connection);
  }

  async createObject(data: IConversionStateData): Promise<{ id: string; editKey: string }> {
    // Generate a temporary ID for the PUT request
    const tempId = this.generateBase58Id(17);
    const tempEditKey = this.generateBase58Id(6);
    
    const response = await fetch(`${BACKEND_URL}/api/objects/${tempId}-${tempEditKey}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create object: ${response.statusText}`);
    }

    return { id: tempId, editKey: tempEditKey };
  }

  private generateBase58Id(len: number = 17): string {
    const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < len; i++) {
      result += base58Chars.charAt(Math.floor(Math.random() * base58Chars.length));
    }
    return result;
  }

  async getObject(id: string): Promise<BackendResponse> {
    const response = await fetch(`${BACKEND_URL}/api/objects/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to get object: ${response.statusText}`);
    }

    return response.json();
  }

  async updateObject(id: string, editKey: string, data: IConversionStateData): Promise<BackendResponse> {
    const response = await fetch(`${BACKEND_URL}/api/objects/${id}-${editKey}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update object: ${response.statusText}`);
    }
    
    return response.json();
  }

  connectWebSocket(id: string, onMessage: (message: unknown) => void): WebSocket {
    // Check if we already have a connection for this ID
    if (this.websockets.has(id)) {
      const existingConnection = this.websockets.get(id)!;
      if (existingConnection.ws.readyState === WebSocket.OPEN || existingConnection.ws.readyState === WebSocket.CONNECTING) {
        console.log(`♻️ Reusing existing WebSocket for ${id}`);
        return existingConnection.ws;
      }
      // Clean up existing connection
      this.cleanupConnection(id);
    }

    const wsUrl = `${BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/api/objects/${id}/ws`;
    
    // Create connection object
    const wsConnection: WebSocketConnection = {
      ws: new WebSocket(wsUrl),
      url: wsUrl,
      onMessage,
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

    this.setupWebSocketHandlers(id, wsConnection);
    this.websockets.set(id, wsConnection);
    
    console.log(`🔗 Connecting WebSocket for worksheet ${id} to:`, wsUrl);
    return wsConnection.ws;
  }

  private setupWebSocketHandlers(id: string, connection: WebSocketConnection): void {
    const { ws, onMessage } = connection;

    ws.onopen = () => {
      console.group(`🔗 WebSocket Connected for ${id}`);
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

      // Start heartbeat
      this.startHeartbeat(id, connection);
    };

    ws.onmessage = (event) => {
      try {
        console.group(`📨 WebSocket Message Received for ${id}`);
        console.log(`🕐 Timestamp:`, new Date().toISOString());
        console.log(`📄 Raw message:`, event.data);
        console.log(`📊 Message size:`, event.data.length, 'bytes');
        console.log(`🔗 WebSocket state:`, ws.readyState);
        
        const data = JSON.parse(event.data);
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
        onMessage(data);
      } catch (error) {
        console.group(`❌ WebSocket Message Parse Error for ${id}`);
        console.error("Raw message:", event.data);
        console.error("Parse error:", error);
        console.groupEnd();
      }
    };

    ws.onclose = (event) => {
      console.group(`🔌 WebSocket Disconnected for ${id}`);
      console.log(`🕐 Disconnected at:`, new Date().toISOString());
      console.log(`🔢 Close code:`, event.code);
      console.log(`📝 Close reason:`, event.reason || 'No reason provided');
      console.log(`✅ Clean close:`, event.wasClean);
      console.log(`🔄 Should reconnect:`, connection.shouldReconnect);
      console.log(`🔢 Reconnect attempts:`, connection.reconnectAttempts);
      console.groupEnd();

      // Clear heartbeat
      this.stopHeartbeat(connection);

      // Attempt reconnection if needed
      if (connection.shouldReconnect && connection.reconnectAttempts < connection.maxReconnectAttempts) {
        this.scheduleReconnect(id, connection);
      } else {
        console.log(`❌ Max reconnection attempts reached for ${id}, giving up`);
        this.websockets.delete(id);
      }
    };

    ws.onerror = (error) => {
      // Only log errors that aren't caused by immediate close (React StrictMode)
      if (ws.readyState !== WebSocket.CLOSED) {
        console.group(`❌ WebSocket Error for ${id}`);
        console.log(`🕐 Error at:`, new Date().toISOString());
        console.log(`🔗 Ready state:`, ws.readyState);
        console.error(`💥 Error:`, error);
        console.groupEnd();
      }
    };
  }

  private startHeartbeat(id: string, connection: WebSocketConnection): void {
    // Clear any existing heartbeat
    this.stopHeartbeat(connection);

    connection.heartbeatInterval = window.setInterval(() => {
      // Check idle state first
      this.checkIdleState(id, connection);
      
      if (connection.ws.readyState === WebSocket.OPEN) {
        // Check if we received a pong recently
        const timeSinceLastPong = Date.now() - connection.lastPongReceived;
        if (timeSinceLastPong > this.HEARTBEAT_TIMEOUT) {
          connection.heartbeatFailures++;
          console.log(`💔 Heartbeat timeout for ${id} (failure ${connection.heartbeatFailures}/${this.HEARTBEAT_RETRY_COUNT})`);
          
          if (connection.heartbeatFailures >= this.HEARTBEAT_RETRY_COUNT) {
            console.log(`💔 Max heartbeat failures reached for ${id}, closing connection`);
            connection.ws.close(1000, 'Heartbeat timeout');
            return;
          }
        }

        // Only send ping if not idle
        if (!connection.isIdle) {
          try {
            connection.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            console.log(`💓 Heartbeat ping sent for ${id}`);
          } catch (error) {
            console.error(`❌ Failed to send heartbeat ping for ${id}:`, error);
          }
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(connection: WebSocketConnection): void {
    if (connection.heartbeatInterval) {
      clearInterval(connection.heartbeatInterval);
      connection.heartbeatInterval = undefined;
    }
  }

  private scheduleReconnect(id: string, connection: WebSocketConnection): void {
    if (connection.isReconnecting) {
      return; // Already reconnecting
    }

    connection.isReconnecting = true;
    connection.reconnectAttempts++;

    console.log(`🔄 Scheduling reconnect for ${id} (attempt ${connection.reconnectAttempts}/${connection.maxReconnectAttempts}) in ${connection.reconnectDelay}ms`);

    setTimeout(() => {
      if (!connection.shouldReconnect || !this.websockets.has(id)) {
        return; // Connection was manually closed or removed
      }

      console.log(`🔄 Attempting to reconnect ${id}...`);
      
      // Create new WebSocket with same URL
      connection.ws = new WebSocket(connection.url);
      this.setupWebSocketHandlers(id, connection);
      
      // Exponential backoff with jitter
      connection.reconnectDelay = Math.min(
        connection.reconnectDelay * 2 + Math.random() * 1000,
        30000 // Max 30 seconds
      );
    }, connection.reconnectDelay);
  }

  private cleanupConnection(id: string): void {
    const connection = this.websockets.get(id);
    if (connection) {
      connection.shouldReconnect = false;
      this.stopHeartbeat(connection);
      if (connection.ws.readyState === WebSocket.OPEN || connection.ws.readyState === WebSocket.CONNECTING) {
        connection.ws.close(1000, 'Manual cleanup');
      }
      this.websockets.delete(id);
    }
  }

  disconnectWebSocket(id: string): void {
    this.cleanupConnection(id);
  }

  disconnectAll(): void {
    this.websockets.forEach((_, id) => {
      this.cleanupConnection(id);
    });
    this.websockets.clear();
  }

  async convertLegacyHash(hash: string): Promise<{ id: string; editKey: string; data: IConversionStateData }> {
    const response = await fetch(`${BACKEND_URL}/api/legacy/convert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hash }),
    });

    if (!response.ok) {
      throw new Error(`Failed to convert legacy hash: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      id: result.id,
      editKey: result.editKey,
      data: result.data,
    };
  }
}
