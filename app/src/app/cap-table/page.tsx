"use client";

import React, { useEffect, useRef, useState } from "react";
import { FaMoon, FaSun } from "react-icons/fa";
import { useStore } from "zustand";
import * as jsondiffpatch from "jsondiffpatch";

import {
  ConversionStore,
  createConversionStore,
} from "./state/ConversionState";
import { getRandomData, initialState } from "./state/initialState";
import { findRecentState, updateRecentStates } from "./state/localstorage";
import Worksheet from "./Worksheet";
import { getSerializedSelector } from "./state/selectors/SerializeSelector";
import { generateBase58UUID } from "@/utils/uuid";
import { BackendService } from "@/services/backendService";

const Page: React.FC = () => {
  const [stateId, setStateId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateReceived, setLastUpdateReceived] = useState<Date | null>(null);
  const [lastUpdateSent, setLastUpdateSent] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [wsConnectionState, setWsConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [wsConnectedAt, setWsConnectedAt] = useState<Date | null>(null);
  const [wsLastError, setWsLastError] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<number>(0);
  const skipNextSaveRef = useRef(false);
  const diffPatcher = useRef(jsondiffpatch.create());

  const backendService = BackendService.getInstance();
  const wsRef = useRef<WebSocket | null>(null);

  const storeRef = useRef<ConversionStore | undefined>(undefined);
  if (storeRef.current === undefined) {
    storeRef.current = createConversionStore(initialState({ ...getRandomData() }));
  }

  const state = useStore(storeRef.current);

  // Format timestamp for display (debugging)
  const formatTimestamp = (date: Date | null) => {
    if (!date) return null;
    return date.toISOString();
  };

  // Handle WebSocket update notifications by fetching and merging data
  const handleUpdateNotification = async (message: any, objectId: string, editKey?: string) => {
    if (message.type === 'update' && message.worksheetId) {
      console.log('📥 Received update notification from WebSocket', {
        worksheetId: message.worksheetId,
        version: message.version,
        lastModified: message.lastModified,
        currentVersion: currentVersion
      });
      
      // Skip if this is our own update (version should be <= currentVersion)
      if (message.version <= currentVersion) {
        console.log('Skipping own/old update', { messageVersion: message.version, currentVersion });
        return;
      }
      
      try {
        // Fetch the latest data from the API
        const response = await backendService.getObject(objectId);
        
        // Get current state
        const currentState = storeRef.current?.getState();
        
        // Create a clean copy of states for diffing
        const cleanCurrent = { ...currentState };
        delete cleanCurrent.objectId;
        delete cleanCurrent.editKey;
        
        const cleanRemote = { ...response.data };
        
        // Calculate the diff
        const diff = diffPatcher.current.diff(cleanCurrent, cleanRemote);
        
        if (diff) {
          console.log('📊 Applying remote changes', diff);
          
          // Apply the diff to current state
          const patched = diffPatcher.current.patch(jsondiffpatch.clone(cleanCurrent), diff);
          
          // Update state with merged data
          skipNextSaveRef.current = true;
          const mergedState = { ...(patched || cleanCurrent), objectId, editKey };
          storeRef.current?.setState(() => mergedState);
          setCurrentVersion(response.version);
          setLastUpdateReceived(new Date());
        } else {
          console.log('No differences found');
        }
      } catch (error) {
        console.error('Failed to fetch and merge update:', error);
      }
    }
  };

  // Listen for hash changes and reload the page
  useEffect(() => {
    let isInitializing = true;
    
    const handleHashChange = () => {
      // Don't reload during initial setup when we're programmatically setting the hash
      if (isInitializing) {
        return;
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

  // Initialize everything once on mount
  useEffect(() => {
    let cleanup = false;
    const initializeApp = async () => {
      if (cleanup) return;
      const hash = window.location.hash.slice(1);
      
      if (hash.length === 0) {
        // No UUID in URL - create new document
        const newState = initialState({ ...getRandomData() });
        
        try {
          const { id, editKey } = await backendService.createObject(newState);
          const stateWithIds = { ...newState, objectId: id, editKey };
          storeRef.current?.setState(stateWithIds);
          updateRecentStates(id, stateWithIds);
          window.location.hash = `${id}-${editKey}`;
          setStateId(`${id}-${editKey}`);
          
          // Connect websocket
          setWsConnectionState('connecting');
          wsRef.current = backendService.connectWebSocket(id, (message) => {
            handleUpdateNotification(message, id, editKey);
          });
          setCurrentVersion(1); // New document starts at version 1
          
          // Add event listeners to track connection state
          if (wsRef.current) {
            wsRef.current.addEventListener('open', () => {
              setWsConnectionState('connected');
              setWsConnectedAt(new Date());
              setWsLastError(null);
            });
            
            wsRef.current.addEventListener('close', () => {
              setWsConnectionState('disconnected');
              setWsConnectedAt(null);
            });
            
            wsRef.current.addEventListener('error', () => {
              setWsConnectionState('error');
              setWsLastError('WebSocket connection error');
            });
          }
          
        } catch (error) {
          console.error("Failed to create new document:", error);
          setError("Failed to create new document");
          // Fallback to local state
          const uuid = generateBase58UUID();
          const fallbackState = { ...newState, objectId: uuid };
          storeRef.current?.setState(fallbackState);
          updateRecentStates(uuid, fallbackState);
          window.location.hash = uuid;
          setStateId(uuid);
        }
        
      } else if (hash.charAt(0) === "A") {
        // Legacy base64 hash - convert using backend
        try {
          console.log("🔄 Converting legacy hash using backend...");
          const { id, editKey, data } = await backendService.convertLegacyHash(hash);
          const stateWithIds = { ...data, objectId: id, editKey };
          storeRef.current?.setState(stateWithIds);
          updateRecentStates(id, stateWithIds);
          window.location.hash = `${id}-${editKey}`;
          setStateId(`${id}-${editKey}`);
          
          // Connect websocket
          setWsConnectionState('connecting');
          wsRef.current = backendService.connectWebSocket(id, (message) => {
            handleUpdateNotification(message, id, editKey);
          });
          setCurrentVersion(1); // Legacy conversion starts at version 1
          
          // Add event listeners to track connection state
          if (wsRef.current) {
            wsRef.current.addEventListener('open', () => {
              setWsConnectionState('connected');
              setWsConnectedAt(new Date());
              setWsLastError(null);
            });
            
            wsRef.current.addEventListener('close', () => {
              setWsConnectionState('disconnected');
              setWsConnectedAt(null);
            });
            
            wsRef.current.addEventListener('error', () => {
              setWsConnectionState('error');
              setWsLastError('WebSocket connection error');
            });
          }
          
          console.log("✅ Successfully converted legacy hash to new format");
          
        } catch (error) {
          console.error("Failed to convert legacy hash:", error);
          // Fallback to local decompression if backend fails
          try {
            console.log("🔄 Falling back to local decompression...");
            const { decompressState } = await import("@/utils/stateCompression");
            const legacyState = decompressState(hash);
            
            const { id, editKey } = await backendService.createObject(legacyState);
            const stateWithIds = { ...legacyState, objectId: id, editKey };
            storeRef.current?.setState(stateWithIds);
            updateRecentStates(id, stateWithIds);
            window.location.hash = `${id}-${editKey}`;
            setStateId(`${id}-${editKey}`);
            
            // Connect websocket
            setWsConnectionState('connecting');
            wsRef.current = backendService.connectWebSocket(id, (message) => {
              handleUpdateNotification(message, id, editKey);
            });
            setCurrentVersion(1); // Legacy conversion starts at version 1
            
            // Add event listeners to track connection state
            if (wsRef.current) {
              wsRef.current.addEventListener('open', () => {
                setWsConnectionState('connected');
                setWsConnectedAt(new Date());
                setWsLastError(null);
              });
              
              wsRef.current.addEventListener('close', () => {
                setWsConnectionState('disconnected');
                setWsConnectedAt(null);
              });
              
              wsRef.current.addEventListener('error', () => {
                setWsConnectionState('error');
                setWsLastError('WebSocket connection error');
              });
            }
            
            console.log("✅ Successfully converted legacy hash using fallback");
          } catch (fallbackError) {
            console.error("Fallback conversion also failed:", fallbackError);
            // Final fallback to new document
            const uuid = generateBase58UUID();
            const newState = initialState({ ...getRandomData() });
            const fallbackState = { ...newState, objectId: uuid };
            storeRef.current?.setState(fallbackState);
            updateRecentStates(uuid, fallbackState);
            window.location.hash = uuid;
            setStateId(uuid);
          }
        }
        
      } else {
        // UUID in URL - could be read-only (objectId) or read-write (objectId-editKey)
        const isComposite = hash.includes('-');
        
        if (isComposite) {
          // Read-write access: objectId-editKey
          const [objectId, editKey] = hash.split('-');
          try {
            const response = await backendService.getObject(objectId);
            const stateData = { ...response.data, objectId, editKey };
            storeRef.current?.setState(stateData);
            setStateId(hash);
            
            // Connect websocket for real-time updates (read-write)
            setWsConnectionState('connecting');
            wsRef.current = backendService.connectWebSocket(objectId, (message) => {
              handleUpdateNotification(message, objectId, editKey);
            });
            setCurrentVersion(response.version);
            
            // Add event listeners to track connection state
            if (wsRef.current) {
              wsRef.current.addEventListener('open', () => {
                setWsConnectionState('connected');
                setWsConnectedAt(new Date());
                setWsLastError(null);
              });
              
              wsRef.current.addEventListener('close', () => {
                setWsConnectionState('disconnected');
                setWsConnectedAt(null);
              });
              
              wsRef.current.addEventListener('error', () => {
                setWsConnectionState('error');
                setWsLastError('WebSocket connection error');
              });
            }
            
          } catch (error) {
            console.error("Failed to load document:", error);
            setError("Failed to load document");
            // Fallback to new document
            const newState = initialState({ ...getRandomData() });
            const fallbackState = { ...newState, objectId: hash };
            storeRef.current?.setState(fallbackState);
            updateRecentStates(hash, fallbackState);
            setStateId(hash);
          }
        } else {
          // Read-only access: objectId only
          try {
            const response = await backendService.getObject(hash);
            const stateData = { ...response.data, objectId: hash };
            storeRef.current?.setState(stateData);
            setStateId(hash);
            
            // Connect websocket for real-time updates (read-only)
            setWsConnectionState('connecting');
            wsRef.current = backendService.connectWebSocket(hash, (message) => {
              handleUpdateNotification(message, hash);
            });
            setCurrentVersion(response.version);
            
            // Add event listeners to track connection state
            if (wsRef.current) {
              wsRef.current.addEventListener('open', () => {
                setWsConnectionState('connected');
                setWsConnectedAt(new Date());
                setWsLastError(null);
              });
              
              wsRef.current.addEventListener('close', () => {
                setWsConnectionState('disconnected');
                setWsConnectedAt(null);
              });
              
              wsRef.current.addEventListener('error', () => {
                setWsConnectionState('error');
                setWsLastError('WebSocket connection error');
              });
            }
            
          } catch (error) {
            console.error("Failed to load document:", error);
            setError("Failed to load document");
            // Fallback to new document
            const newState = initialState({ ...getRandomData() });
            const fallbackState = { ...newState, objectId: hash };
            storeRef.current?.setState(fallbackState);
            updateRecentStates(hash, fallbackState);
            setStateId(hash);
          }
        }
      }
      
      setIsLoading(false);
    };

    initializeApp();
    
    // Cleanup on unmount
    return () => {
      cleanup = true;
      // Small delay to prevent immediate close/reopen in StrictMode
      setTimeout(() => {
        if (wsRef.current) {
          wsRef.current.close();
        }
        backendService.disconnectAll();
      }, 100);
    };
  }, [backendService]);

  // Auto-save changes to backend (debounced)
  useEffect(() => {
    // If this state change came from websocket, skip the save
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    
    if (!isLoading && state.objectId && state.editKey) {
      const timeoutId = setTimeout(async () => {
        try {
          setIsSaving(true);
          console.log('📤 Saving changes to backend...');
          const response = await backendService.updateObject(state.objectId!, state.editKey!, getSerializedSelector(state));
          setCurrentVersion(response.version);
          setLastUpdateSent(new Date());
          console.log('✅ Save successful', { version: response.version });
        } catch (error) {
          console.error("❌ Failed to save:", error);
          setError("Failed to save changes");
        } finally {
          setIsSaving(false);
        }
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [state, isLoading, backendService]);


  // Load from local storage (for recent states menu)
  const loadById = (id: string) => {
    const state = findRecentState(id);
    if (state) {
      setStateId(id);
      storeRef.current?.setState(state);
    }
  };

  // Create new state (for "New" button)
  const createNewState = () => {
    window.location.hash = ""; // This will trigger a reload with no hash
    window.location.reload();
  };

  // Clone functionality for read-only users
  const handleClone = async () => {
    if (!state.objectId || state.editKey) {
      // Only allow cloning from read-only mode
      return;
    }

    setIsCloning(true);
    try {
      // Create a clean copy of the current state without objectId and editKey
      const currentStateData = getSerializedSelector(state);
      
      // Create new object with the current state
      const { id, editKey } = await backendService.createObject(currentStateData);
      const stateWithIds = { ...currentStateData, objectId: id, editKey };
      
      // Close current WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      // Update state and URL
      storeRef.current?.setState(stateWithIds);
      updateRecentStates(id, stateWithIds);
      window.location.hash = `${id}-${editKey}`;
      setStateId(`${id}-${editKey}`);
      
      // Connect new websocket for the cloned document
      setWsConnectionState('connecting');
      wsRef.current = backendService.connectWebSocket(id, (message) => {
        if (message.type === 'update' && message.data) {
          console.log('📥 Received update from WebSocket (cloned)');
          skipNextSaveRef.current = true;
          const stateWithEditKey = { ...message.data, objectId: id, editKey };
          storeRef.current?.setState(() => stateWithEditKey);
          setLastUpdateReceived(new Date());
        }
      });
      
      // Add event listeners to track connection state
      if (wsRef.current) {
        wsRef.current.addEventListener('open', () => {
          setWsConnectionState('connected');
          setWsConnectedAt(new Date());
          setWsLastError(null);
        });
        
        wsRef.current.addEventListener('close', () => {
          setWsConnectionState('disconnected');
          setWsConnectedAt(null);
        });
        
        wsRef.current.addEventListener('error', () => {
          setWsConnectionState('error');
          setWsLastError('WebSocket connection error');
        });
      }
      
      console.log('✅ Successfully cloned worksheet');
    } catch (error) {
      console.error("❌ Failed to clone worksheet:", error);
      setError("Failed to clone worksheet");
    } finally {
      setIsCloning(false);
    }
  };

  // Dark mode state
  const [darkMode, setDarkMode] = useState(false);
  
  // Initialize dark mode state based on local storage or system preference
  useEffect(() => {
    // Check local storage for theme preference
    const storedTheme = localStorage.getItem('color-theme');
    
    if (storedTheme) {
      // If we have a stored preference, use it
      const isDarkMode = storedTheme === 'dark';
      setDarkMode(isDarkMode);
      document.documentElement.classList.toggle('dark', isDarkMode);
    } else {
      // If no stored preference, check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, []);
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    
    // Save preference to local storage when user explicitly toggles
    localStorage.setItem('color-theme', newMode ? 'dark' : 'light');
  };

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only apply system preference changes if no theme is set in localStorage
      if (!localStorage.getItem('color-theme')) {
        const prefersDark = e.matches;
        setDarkMode(prefersDark);
        document.documentElement.classList.toggle('dark', prefersDark);
      }
    };
    
    // Add event listener
    mediaQuery.addEventListener('change', handleChange);
    
    // Clean up
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  if (isLoading) {
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
      <main className="flex min-h-screen flex-col items-center justify-between py-8">
        {/* Error notification */}
        {error && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg z-50">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        )}

        {/* Breadcrumb and Heading */}
        <div className="z-10 w-full max-w-5xl mb-6 px-2">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            <a
              className="hover:text-nt84orange"
              href="https://1984.vc/docs/founders-handbook"
            >
              Founders Handbook
            </a>{" "}
            &gt; <span>Cap Table Worksheet</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            1984 Cap Table Worksheet
          </h1>
          
          {/* Read-only mode indicator and clone button */}
          {!state.editKey && state.objectId && (
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
          )}
          
          {/* WebSocket Debug Information - Always visible */}
          <div className="flex flex-col mt-2 space-y-1">
            <div className="flex items-center">
              {/* Connection status indicator */}
              {wsConnectionState === 'connected' && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
              )}
              {wsConnectionState === 'connecting' && (
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-2"></div>
              )}
              {wsConnectionState === 'disconnected' && (
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
              )}
              {wsConnectionState === 'error' && (
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              )}
              
              {/* Connection status text */}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {wsConnectionState === 'connected' && 'Connected - changes sync in real-time'}
                {wsConnectionState === 'connecting' && 'Connecting to real-time sync...'}
                {wsConnectionState === 'disconnected' && 'Disconnected - working offline'}
                {wsConnectionState === 'error' && 'Connection error - working offline'}
                {' '}
                {state.editKey ? '(Read/Write)' : '(Read-only)'}
              </span>
              
              {/* Saving indicator */}
              {isSaving && (
                <span className="ml-2 text-xs text-blue-500 dark:text-blue-400">
                  Saving...
                </span>
              )}
            </div>
            
            {/* Detailed metrics */}
            <div className="flex items-center space-x-4 text-xs text-gray-400 dark:text-gray-500">
              {/* Connection time */}
              {wsConnectedAt && (
                <span>
                  Connected: {formatTimestamp(wsConnectedAt)}
                </span>
              )}
              
              {/* Last update sent (only for read-write mode) */}
              {state.editKey && lastUpdateSent && (
                <span>
                  Last sent: {formatTimestamp(lastUpdateSent)}
                </span>
              )}
              
              {/* Last update received */}
              {lastUpdateReceived && (
                <span>
                  Last received: {formatTimestamp(lastUpdateReceived)}
                </span>
              )}
              
              {/* Error information */}
              {wsLastError && (
                <span className="text-red-400">
                  Error: {wsLastError}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
          <Worksheet
            conversionState={state}
            currentStateId={stateId}
            loadById={loadById}
            createNewState={createNewState}
            onClone={handleClone}
            isCloning={isCloning}
          />
        </div>

        {/* Dark mode toggle at top right corner */}
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm flex items-center gap-2 transition-colors"
            aria-label={
              darkMode ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {darkMode ? (
              <FaMoon className="mr-0 md:mr-1" />
            ) : (
              <FaSun className="mr-0 md:mr-1" />
            )}
            <span className="hidden md:inline">
              {darkMode ? "Founder Mode" : "VC Mode"}
            </span>
          </button>
        </div>

        <div className="w-full max-w-5xl px-4 mt-24 border-t pt-8 border-gray-300 dark:border-gray-500">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            About the Cap Table Worksheet
          </h1>

          <div className="space-y-6 text-gray-700 dark:text-gray-300">
            <p className="leading-relaxed">
              At 1984 we believe founders should be able to quickly understand
              the decisions they make with regards to financing, particularly at
              the earliest stages when legal support is minimal. We believe
              SAFEs in particular should be easy to understand and model, and
              the tools should be open source, well-tested, and easy for anyone
              to use. Currently the best we have are either aging Excel
              spreadsheets that get passed around, or a fairly rudimentary
              webapp–which is why we created this project.
            </p>

            <p className="leading-relaxed">
              The captable worksheet is an open-source tool to help
              founders model their SAFE and priced rounds. The module is
              available on{" "}
              <a
                href="https://github.com/1984vc/startup-finance"
                target="_blank"
                rel="noopener"
                className="text-nt84orange hover:text-nt84orangedarker underline font-medium"
              >
                github
              </a>{" "}
              and 1984 hosts an instance at{" "}
              <a
                href="/docs/cap-table-worksheet"
                className="text-nt84orange hover:text-nt84orangedarker underline font-medium"
              >
                https://1984.vc/docs/cap-table-worksheet
              </a>
            </p>

            <p className="leading-relaxed pt-2 border-t border-gray-200 dark:border-gray-700">
              We value all input! If you'd like to report bugs, provide
              feedback, or suggest improvements, please email{" "}
              <a
                href="mailto:team@1984.vc"
                className="text-nt84orange hover:text-nt84orangedarker underline font-medium"
              >
                team@1984.vc
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Page;
