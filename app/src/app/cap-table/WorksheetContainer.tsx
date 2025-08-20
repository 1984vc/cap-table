"use client";

import React, { useEffect, useRef, useState } from "react";

import { IConversionState } from "./state/ConversionState";
import { getRandomData, initialState } from "./state/initialState";
import { 
  WebSocketManager, 
  WebSocketConnectionState, 
  WebSocketManagerEvents 
} from "./managers/WebSocketManager";
import { 
  StateManager, 
  StateManagerEvents, 
  StateManagerStatus 
} from "./managers/StateManager";
import Worksheet from "./Worksheet";
import { DebugOverlay } from "./components/DebugOverlay";
import { addToHistory } from "@/services/historyService";

interface WorksheetContainerProps {
  onCreateNew: () => void;
}

const WorksheetContainer: React.FC<WorksheetContainerProps> = ({ onCreateNew }) => {
  // Managers
  const stateManagerRef = useRef<StateManager | null>(null);
  const webSocketManagerRef = useRef<WebSocketManager | null>(null);
  
  // Component state
  const [conversionState, setConversionState] = useState<IConversionState | null>(null);
  const [wsConnectionState, setWsConnectionState] = useState<WebSocketConnectionState>({
    status: 'disconnected',
    connectedAt: null,
    lastError: null,
    reconnectAttempts: 0
  });
  const [stateStatus, setStateStatus] = useState<StateManagerStatus>({
    isLoading: true,
    isSaving: false,
    lastUpdateSent: null,
    lastUpdateReceived: null,
    currentVersion: 0,
    error: null
  });
  const [isCloning, setIsCloning] = useState(false);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
  const [showSavingIndicator, setShowSavingIndicator] = useState(false);
  const savingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize managers and load data
  useEffect(() => {
    let cleanup = false;
    
    const initializeApp = async () => {
      if (cleanup) return;
      
      const hash = window.location.hash.slice(1);
      
      // Create StateManager events
      const stateManagerEvents: StateManagerEvents = {
        onStateChange: (state) => {
          setConversionState(state);
        },
        onSaveStart: () => {
          setStateStatus(prev => ({ ...prev, isSaving: true }));
          setShowSavingIndicator(true);
          // Clear any existing timeout
          if (savingTimeoutRef.current) {
            clearTimeout(savingTimeoutRef.current);
          }
        },
        onSaveComplete: (version) => {
          setStateStatus(prev => ({ 
            ...prev, 
            isSaving: false, 
            currentVersion: version,
            lastUpdateSent: new Date()
          }));
          // Keep the saving indicator visible for a moment
          savingTimeoutRef.current = setTimeout(() => {
            setShowSavingIndicator(false);
          }, 500);
        },
        onSaveError: (error) => {
          setStateStatus(prev => ({ 
            ...prev, 
            isSaving: false, 
            error 
          }));
        },
        onRemoteUpdate: (version) => {
          setStateStatus(prev => ({ 
            ...prev, 
            currentVersion: version,
            lastUpdateReceived: new Date()
          }));
        }
      };

      // Create WebSocket events
      const webSocketEvents: WebSocketManagerEvents = {
        onStateChange: (state) => {
          setWsConnectionState(state);
        },
        onMessage: async (message) => {
          if (stateManagerRef.current) {
            await stateManagerRef.current.handleRemoteUpdate(message);
          }
        },
        onError: (error) => {
          console.error('WebSocket error:', error);
          setStateStatus(prev => ({ ...prev, error }));
        }
      };

      // Initialize StateManager
      const initialStateData = initialState({ ...getRandomData() });
      stateManagerRef.current = new StateManager(initialStateData, stateManagerEvents);
      
      // Initialize WebSocketManager
      webSocketManagerRef.current = new WebSocketManager(webSocketEvents);
      
      // Connect StateManager and WebSocketManager for health checks
      stateManagerRef.current.setWebSocketManager(webSocketManagerRef.current);

      try {
        // Initialize state from URL
        await stateManagerRef.current.initialize(hash);
        const state = stateManagerRef.current.getState();
        
        // Update URL if needed
        if (hash.length === 0 && state.objectId && state.editKey) {
          window.location.hash = `${state.objectId}-${state.editKey}`;
        } else if (hash.charAt(0) === "A" && state.objectId && state.editKey) {
          window.location.hash = `${state.objectId}-${state.editKey}`;
        }

        // Add to history if we have a valid worksheet
        if (state.objectId) {
          addToHistory(state.objectId, state.name, state.editKey);
        }

        // Connect WebSocket if we have an objectId
        if (state.objectId) {
          const backendUrl = getBackendUrl();
          const wsUrl = `${backendUrl.replace('https://', 'wss://').replace('http://', 'ws://')}/api/objects/${state.objectId}/ws`;
          webSocketManagerRef.current.connect(wsUrl);
        }

        // Update status
        setStateStatus(stateManagerRef.current.getStatus());
        
      } catch (error) {
        console.error("Failed to initialize app:", error);
        setStateStatus(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: `Failed to initialize: ${error}` 
        }));
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      cleanup = true;
      // Small delay to prevent immediate close/reopen in StrictMode
      setTimeout(() => {
        if (webSocketManagerRef.current) {
          webSocketManagerRef.current.destroy();
        }
        if (stateManagerRef.current) {
          stateManagerRef.current.destroy();
        }
      }, 100);
    };
  }, []);

  // Handle Ctrl+D keyboard shortcut for debug overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        setShowDebugOverlay(prev => {
          const newValue = !prev;
          // Enable/disable debug mode in WebSocketManager
          if (webSocketManagerRef.current) {
            webSocketManagerRef.current.setDebugMode(newValue);
          }
          return newValue;
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (savingTimeoutRef.current) {
        clearTimeout(savingTimeoutRef.current);
      }
    };
  }, []);

  // Track user activity for WebSocket connection management
  useEffect(() => {
    if (!conversionState?.objectId || !webSocketManagerRef.current) return;

    const markActive = () => {
      webSocketManagerRef.current?.markActive();
      // Also ensure connection is healthy on any interaction
      webSocketManagerRef.current?.ensureConnected();
    };

    // Track various user interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, markActive, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, markActive);
      });
    };
  }, [conversionState?.objectId]);

  // Listen for hash changes and reload the page
  useEffect(() => {
    let isInitializing = true;
    
    const handleHashChange = () => {
      // Don't reload during initial setup when we're programmatically setting the hash
      if (isInitializing) {
        return;
      }
      
      // Extract objectId and editKey from the new hash
      const newHash = window.location.hash.slice(1);
      if (newHash) {
        const parts = newHash.split('-');
        const objectId = parts[0];
        const editKey = parts.length > 1 ? parts.slice(1).join('-') : undefined;
        
        // Add to history before reloading
        if (objectId) {
          // We don't have the name yet, so it will be generated from UUID
          addToHistory(objectId, undefined, editKey);
        }
      }
      
      // When the hash changes manually, reload the page to reinitialize everything
      window.location.reload();
    };

    window.addEventListener('hashchange', handleHashChange);
    
    // After a short delay, mark initialization as complete
    // This allows the initial hash setting to complete without triggering a reload
    const timer = setTimeout(() => {
      isInitializing = false;
    }, 1000);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      clearTimeout(timer);
    };
  }, []);

  // Clone functionality for read-only users
  const handleClone = async () => {
    if (!conversionState?.objectId || conversionState.editKey || !stateManagerRef.current) {
      // Only allow cloning from read-only mode
      return;
    }

    setIsCloning(true);
    try {
      // Clone the document
      const { id, editKey } = await stateManagerRef.current.cloneDocument();
      
      // Disconnect current WebSocket
      if (webSocketManagerRef.current) {
        webSocketManagerRef.current.disconnect();
      }
      
      // Add cloned worksheet to history
      addToHistory(id, conversionState.name, editKey);
      
      // Update URL
      window.location.hash = `${id}-${editKey}`;
      
      // Connect new WebSocket for the cloned document
      if (webSocketManagerRef.current) {
        const backendUrl = getBackendUrl();
        const wsUrl = `${backendUrl.replace('https://', 'wss://').replace('http://', 'ws://')}/api/objects/${id}/ws`;
        webSocketManagerRef.current.connect(wsUrl);
      }
      
      console.log('✅ Successfully cloned worksheet');
    } catch (error) {
      console.error("❌ Failed to clone worksheet:", error);
      setStateStatus(prev => ({ ...prev, error: "Failed to clone worksheet" }));
    } finally {
      setIsCloning(false);
    }
  };

  // Clear error
  const clearError = () => {
    if (stateManagerRef.current) {
      stateManagerRef.current.clearError();
    }
    setStateStatus(prev => ({ ...prev, error: null }));
  };

  // Loading state
  if (stateStatus.isLoading || !conversionState) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nt84orange mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Error notification */}
      {stateStatus.error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg z-50">
          {stateStatus.error}
          <button
            onClick={clearError}
            className="ml-2 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}

      {/* Debug Overlay */}
      <DebugOverlay
        isVisible={showDebugOverlay}
        wsConnectionState={wsConnectionState}
        stateStatus={stateStatus}
        hasEditKey={!!conversionState.editKey}
      />

      {/* Read-only mode indicator and clone button */}
      {!conversionState.editKey && conversionState.objectId && (
        <div className="w-full max-w-5xl mb-6 px-2">
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                    Read-Only Mode
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    You're viewing this worksheet in read-only mode. Clone it to create your own editable copy.
                  </p>
                </div>
              </div>
              <button
                onClick={handleClone}
                disabled={isCloning}
                className="bg-nt84orange hover:bg-nt84orangedarker disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-3 rounded-lg transition-colors flex items-center"
              >
                {isCloning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Cloning...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Clone to Edit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Worksheet Component with connection status */}
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <Worksheet
          conversionState={conversionState}
          createNewState={onCreateNew}
          onClone={handleClone}
          isCloning={isCloning}
          wsConnectionState={wsConnectionState}
          showSavingIndicator={showSavingIndicator}
        />
      </div>
    </div>
  );
};

// Helper function to get backend URL (extracted from backendService)
function getBackendUrl(): string {
  // Priority 1: Explicit VITE_BACKEND_URL (highest priority)
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  // Priority 2: Environment-specific URLs
  if (import.meta.env.VITE_STAGING_BACKEND_URL && import.meta.env.VITE_ENVIRONMENT === 'staging') {
    return import.meta.env.VITE_STAGING_BACKEND_URL;
  }
  
  if (import.meta.env.VITE_PRODUCTION_BACKEND_URL && import.meta.env.VITE_ENVIRONMENT === 'production') {
    return import.meta.env.VITE_PRODUCTION_BACKEND_URL;
  }
  
  // Priority 3: Development mode detection
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_USE_LOCAL_WORKER === 'true' 
      ? 'http://localhost:8787' 
      : 'https://1984-startup-finance-worker.mdp-005.workers.dev';
  }
  
  // Priority 4: Default production worker
  return 'https://1984-startup-finance-worker.mdp-005.workers.dev';
}

export default WorksheetContainer;
