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

export class BackendService {
  private static instance: BackendService;
  private websockets: Map<string, WebSocket> = new Map();

  static getInstance(): BackendService {
    if (!BackendService.instance) {
      BackendService.instance = new BackendService();
    }
    return BackendService.instance;
  }

  async createObject(data: IConversionStateData): Promise<{ id: string; editKey: string }> {
    // Generate a temporary ID for the PUT request
    const tempId = this.generateBase58Id();
    const tempEditKey = this.generateBase58Id();
    
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

  private generateBase58Id(len: number = 22): string {
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

  connectWebSocket(id: string, onMessage: (message: any) => void): WebSocket {
    if (this.websockets.has(id)) {
      const existingWs = this.websockets.get(id);
      if (existingWs?.readyState === WebSocket.OPEN || existingWs?.readyState === WebSocket.CONNECTING) {
        console.log(`♻️ Reusing existing WebSocket for ${id}`);
        return existingWs;
      }
      existingWs?.close();
      this.websockets.delete(id);
    }

    const wsUrl = `${BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/api/objects/${id}/ws`;
    console.log(`🔗 Connecting WebSocket for worksheet ${id} to:`, wsUrl);
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      try {
        console.log(`📨 Raw WebSocket message received for ${id}:`, event.data);
        const data = JSON.parse(event.data);
        console.log(`📥 Parsed WebSocket message for ${id}:`, data);
        onMessage(data);
      } catch (error) {
        console.error("❌ Failed to parse websocket message:", error);
      }
    };

    ws.onopen = () => {
      console.log(`🔗 WebSocket connected for worksheet ${id}`);
    };

    ws.onclose = (event) => {
      console.log(`🔌 WebSocket disconnected for ${id}`, { code: event.code, reason: event.reason });
      this.websockets.delete(id);
    };

    ws.onerror = (error) => {
      // Only log errors that aren't caused by immediate close (React StrictMode)
      if (ws.readyState !== WebSocket.CLOSED) {
        console.error(`❌ WebSocket error for ${id}:`, error);
      }
    };

    this.websockets.set(id, ws);
    return ws;
  }

  disconnectWebSocket(id: string): void {
    const ws = this.websockets.get(id);
    if (ws) {
      ws.close();
      this.websockets.delete(id);
    }
  }

  disconnectAll(): void {
    this.websockets.forEach((ws) => ws.close());
    this.websockets.clear();
  }

  async convertLegacyHash(hash: string): Promise<{ id: string; editKey: string; data: any }> {
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
