import { IConversionStateData } from "@/cap-table/state/ConversionState";

const getBackendUrl = () => {
  // Check for explicit environment variable first
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  // Fall back to mode-based detection
  if (import.meta.env.DEV) {
    // In development mode, check if we want to use local worker
    return import.meta.env.VITE_USE_LOCAL_WORKER === 'true' 
      ? 'http://localhost:8787' 
      : 'https://1984-startup-finance-worker.mdp-005.workers.dev';
  }
  
  // Production build always uses production worker
  return 'https://1984-startup-finance-worker.mdp-005.workers.dev';
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

  async updateObject(id: string, editKey: string, data: IConversionStateData): Promise<void> {
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
  }

  connectWebSocket(id: string, onMessage: (message: any) => void): WebSocket {
    if (this.websockets.has(id)) {
      const existingWs = this.websockets.get(id);
      if (existingWs?.readyState === WebSocket.OPEN || existingWs?.readyState === WebSocket.CONNECTING) {
        return existingWs;
      }
      existingWs?.close();
      this.websockets.delete(id);
    }

    const wsUrl = `${BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/api/objects/${id}/ws`;
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error("❌ Failed to parse websocket message:", error);
      }
    };

    ws.onopen = () => {
      console.log(`🔗 WebSocket connected`);
    };

    ws.onclose = () => {
      console.log(`🔌 WebSocket disconnected`);
      this.websockets.delete(id);
    };

    ws.onerror = (error) => {
      // Only log errors that aren't caused by immediate close (React StrictMode)
      if (ws.readyState !== WebSocket.CLOSED) {
        console.error("❌ WebSocket error:", error);
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
}
