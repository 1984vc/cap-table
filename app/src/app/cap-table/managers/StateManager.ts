import * as jsondiffpatch from "jsondiffpatch";

import {
  ConversionStore,
  createConversionStore,
  IConversionStateData,
  IConversionState,
} from "../state/ConversionState";
import { getSerializedSelector } from "../state/selectors/SerializeSelector";
import { BackendService } from "@/services/backendService";
import { WebSocketMessage, WebSocketManager } from "./WebSocketManager";
import { generateDockerStyleName } from "@/utils/names";

export interface StateManagerEvents {
  onStateChange: (state: IConversionState) => void;
  onSaveStart: () => void;
  onSaveComplete: (version: number) => void;
  onSaveError: (error: string) => void;
  onRemoteUpdate: (version: number) => void;
}

export interface StateManagerStatus {
  isLoading: boolean;
  isSaving: boolean;
  lastUpdateSent: Date | null;
  lastUpdateReceived: Date | null;
  currentVersion: number;
  error: string | null;
}

export class StateManager {
  private store: ConversionStore;
  private events: StateManagerEvents;
  private backendService: BackendService;
  private status: StateManagerStatus;
  private skipNextSave = false;
  private diffPatcher = jsondiffpatch.create();
  private saveTimeoutId: number | null = null;
  private readonly SAVE_DEBOUNCE_MS = 2000;
  private webSocketManager: WebSocketManager | null = null;

  constructor(initialState: IConversionStateData, events: StateManagerEvents) {
    this.store = createConversionStore(initialState);
    this.events = events;
    this.backendService = BackendService.getInstance();
    this.status = {
      isLoading: false,
      isSaving: false,
      lastUpdateSent: null,
      lastUpdateReceived: null,
      currentVersion: 0,
      error: null
    };

    // Subscribe to store changes for auto-save
    this.store.subscribe((state) => {
      this.events.onStateChange(state);
      this.scheduleAutoSave(state);
    });
  }

  // Get current state
  getState(): IConversionState {
    return this.store.getState();
  }

  // Get current status
  getStatus(): StateManagerStatus {
    return { ...this.status };
  }

  // Set WebSocket manager reference for connection health checks
  setWebSocketManager(webSocketManager: WebSocketManager): void {
    this.webSocketManager = webSocketManager;
  }

  // Initialize state from backend or create new
  async initialize(hash: string): Promise<void> {
    this.updateStatus({ isLoading: true, error: null });

    try {
      if (hash.length === 0) {
        // No UUID in URL - create new document
        await this.createNewDocument();
      } else if (hash.charAt(0) === "A") {
        // Legacy base64 hash - convert using backend
        await this.convertLegacyHash(hash);
      } else {
        // UUID in URL - could be read-only (objectId) or read-write (objectId-editKey)
        await this.loadExistingDocument(hash);
      }
    } catch (error) {
      console.error("Failed to initialize state:", error);
      this.updateStatus({ error: `Failed to initialize: ${error}` });
      // Fallback to local state
      await this.createFallbackDocument(hash);
    } finally {
      this.updateStatus({ isLoading: false });
    }
  }

  // Create a new document
  async createNewDocument(): Promise<{ id: string; editKey: string }> {
    const currentState = this.getState();
    const serializedState = getSerializedSelector(currentState);
    
    const { id, editKey } = await this.backendService.createObject(serializedState);
    
    // Generate name if not already set
    const generatedName = !serializedState.name ? generateDockerStyleName(id) : serializedState.name;
    const stateWithIds = { ...serializedState, objectId: id, editKey, name: generatedName };
    
    this.store.setState(stateWithIds);
    this.updateStatus({ currentVersion: 1 });
    
    return { id, editKey };
  }

  // Convert legacy hash
  async convertLegacyHash(hash: string): Promise<{ id: string; editKey: string }> {
    console.log("🔄 Converting legacy hash using backend...");
    const { id, editKey, data } = await this.backendService.convertLegacyHash(hash);
    
    // Generate name if not already set
    const generatedName = !data.name ? generateDockerStyleName(id) : data.name;
    const stateWithIds = { ...data, objectId: id, editKey, name: generatedName };
    
    this.store.setState(stateWithIds);
    this.updateStatus({ currentVersion: 1 });
    
    console.log("✅ Successfully converted legacy hash to new format");
    return { id, editKey };
  }

  // Load existing document
  async loadExistingDocument(hash: string): Promise<{ id: string; editKey?: string }> {
    const isComposite = hash.includes('-');
    
    if (isComposite) {
      // Read-write access: objectId-editKey
      const [objectId, editKey] = hash.split('-');
      const response = await this.backendService.getObject(objectId);
      
      // Generate name if not already set (for backward compatibility)
      const generatedName = !response.data.name ? generateDockerStyleName(objectId) : response.data.name;
      const stateData = { ...response.data, objectId, editKey, name: generatedName };
      
      this.store.setState(stateData);
      this.updateStatus({ currentVersion: response.version });
      
      return { id: objectId, editKey };
    } else {
      // Read-only access: objectId only
      const response = await this.backendService.getObject(hash);
      
      // Generate name if not already set (for backward compatibility)
      const generatedName = !response.data.name ? generateDockerStyleName(hash) : response.data.name;
      const stateData = { ...response.data, objectId: hash, name: generatedName };
      
      this.store.setState(stateData);
      this.updateStatus({ currentVersion: response.version });
      
      return { id: hash };
    }
  }

  // Create fallback document when backend fails
  async createFallbackDocument(hash: string): Promise<void> {
    const currentState = this.getState();
    const fallbackState = { ...currentState, objectId: hash };
    this.store.setState(fallbackState);
  }

  // Clone current state to new document
  async cloneDocument(): Promise<{ id: string; editKey: string }> {
    const currentState = this.getState();
    const currentStateData = getSerializedSelector(currentState);
    
    // Create new object with the current state
    const { id, editKey } = await this.backendService.createObject(currentStateData);
    
    // Generate new name for cloned worksheet
    const generatedName = generateDockerStyleName(id);
    const stateWithIds = { ...currentStateData, objectId: id, editKey, name: generatedName };
    
    this.store.setState(stateWithIds);
    this.updateStatus({ currentVersion: 1 });
    
    console.log('✅ Successfully cloned worksheet');
    return { id, editKey };
  }

  // Handle WebSocket update notifications
  async handleRemoteUpdate(message: WebSocketMessage): Promise<void> {
    if (message.type !== 'update' || !message.worksheetId) {
      return;
    }

    console.log('📥 Received update notification from WebSocket', {
      worksheetId: message.worksheetId,
      version: message.version,
      lastModified: message.lastModified,
      currentVersion: this.status.currentVersion
    });
    
    // Skip if this is our own update (version should be <= currentVersion)
    if (message.version && message.version <= this.status.currentVersion) {
      console.log('Skipping own/old update', { 
        messageVersion: message.version, 
        currentVersion: this.status.currentVersion 
      });
      return;
    }
    
    try {
      // Fetch the latest data from the API
      const response = await this.backendService.getObject(message.worksheetId);
      
      // Get current state
      const currentState = this.store.getState();
      
      // Create a clean copy of states for diffing
      const cleanCurrent = { ...currentState };
      delete cleanCurrent.objectId;
      delete cleanCurrent.editKey;
      
      const cleanRemote = { ...response.data };
      
      // Calculate the diff
      const diff = this.diffPatcher.diff(cleanCurrent, cleanRemote);
      
      if (diff) {
        console.log('📊 Applying remote changes', diff);
        
        // Apply the diff to current state
        const patched = this.diffPatcher.patch(jsondiffpatch.clone(cleanCurrent), diff);
        
        // Update state with merged data
        this.skipNextSave = true;
        const mergedState = { 
          ...(patched || cleanCurrent), 
          objectId: currentState.objectId, 
          editKey: currentState.editKey 
        };
        
        this.store.setState(() => mergedState);
        this.updateStatus({ 
          currentVersion: response.version,
          lastUpdateReceived: new Date()
        });
        
        this.events.onRemoteUpdate(response.version);
      } else {
        console.log('No differences found');
      }
    } catch (error) {
      console.error('Failed to fetch and merge update:', error);
      this.updateStatus({ error: `Failed to merge remote update: ${error}` });
    }
  }

  // Schedule auto-save with debouncing
  private scheduleAutoSave(state: IConversionState): void {
    // If this state change came from websocket, skip the save
    if (this.skipNextSave) {
      this.skipNextSave = false;
      return;
    }
    
    // Only auto-save if we have edit access
    if (!state.objectId || !state.editKey || this.status.isLoading) {
      return;
    }

    // Clear existing timeout
    if (this.saveTimeoutId) {
      clearTimeout(this.saveTimeoutId);
    }

    // Schedule new save
    this.saveTimeoutId = window.setTimeout(async () => {
      await this.saveToBackend(state);
    }, this.SAVE_DEBOUNCE_MS);
  }

  // Save state to backend
  private async saveToBackend(state: IConversionState): Promise<void> {
    if (!state.objectId || !state.editKey) {
      return;
    }

    try {
      this.updateStatus({ isSaving: true });
      this.events.onSaveStart();
      
      console.log('📤 Saving changes to backend...');
      const response = await this.backendService.updateObject(
        state.objectId, 
        state.editKey, 
        getSerializedSelector(state)
      );
      
      this.updateStatus({ 
        currentVersion: response.version,
        lastUpdateSent: new Date(),
        isSaving: false
      });
      
      this.events.onSaveComplete(response.version);
      console.log('✅ Save successful', { version: response.version });
      
      // After successful save, ensure WebSocket is connected for real-time sync
      if (this.webSocketManager) {
        this.webSocketManager.ensureConnected();
      }
    } catch (error) {
      console.error("❌ Failed to save:", error);
      this.updateStatus({ 
        error: `Failed to save changes: ${error}`,
        isSaving: false
      });
      this.events.onSaveError(`Failed to save changes: ${error}`);
    }
  }

  // Manual save (for immediate saves)
  async saveNow(): Promise<void> {
    const state = this.getState();
    if (this.saveTimeoutId) {
      clearTimeout(this.saveTimeoutId);
      this.saveTimeoutId = null;
    }
    await this.saveToBackend(state);
  }

  // Update status and notify events
  private updateStatus(updates: Partial<StateManagerStatus>): void {
    this.status = { ...this.status, ...updates };
  }

  // Clear error
  clearError(): void {
    this.updateStatus({ error: null });
  }

  // Destroy and cleanup
  destroy(): void {
    if (this.saveTimeoutId) {
      clearTimeout(this.saveTimeoutId);
      this.saveTimeoutId = null;
    }
  }
}
