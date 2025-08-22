import React from 'react';
import { WebSocketConnectionState } from '../managers/WebSocketManager';
import { StateManagerStatus } from '../managers/StateManager';

interface DebugOverlayProps {
  isVisible: boolean;
  wsConnectionState: WebSocketConnectionState;
  stateStatus: StateManagerStatus;
  hasEditKey: boolean;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({
  isVisible,
  wsConnectionState,
  stateStatus,
  hasEditKey,
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-gray-900/95 dark:bg-gray-800/95 text-white rounded-lg shadow-xl p-4 max-w-md backdrop-blur-sm border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-200">WebSocket Debug Info</h3>
        <span className="text-xs text-gray-400">Press Ctrl+D to hide</span>
      </div>
      
      <div className="space-y-2 text-xs">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Status:</span>
          <span className={`font-mono ${
            wsConnectionState.status === 'connected' ? 'text-green-400' :
            wsConnectionState.status === 'connecting' ? 'text-yellow-400' :
            wsConnectionState.status === 'error' ? 'text-red-400' :
            'text-gray-400'
          }`}>
            {wsConnectionState.status.toUpperCase()}
          </span>
        </div>

        {/* Mode */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Mode:</span>
          <span className="font-mono">
            {hasEditKey ? 'READ/WRITE' : 'READ-ONLY'}
          </span>
        </div>

        {/* Connected At */}
        {wsConnectionState.connectedAt && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Connected:</span>
            <span className="font-mono text-gray-300">
              {new Date(wsConnectionState.connectedAt).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Reconnect Attempts */}
        {wsConnectionState.reconnectAttempts > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Reconnect Attempts:</span>
            <span className="font-mono text-yellow-400">
              {wsConnectionState.reconnectAttempts}
            </span>
          </div>
        )}

        {/* Version */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Version:</span>
          <span className="font-mono text-gray-300">
            {stateStatus.currentVersion}
          </span>
        </div>

        {/* Last Update Sent */}
        {hasEditKey && stateStatus.lastUpdateSent && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Last Sent:</span>
            <span className="font-mono text-gray-300">
              {new Date(stateStatus.lastUpdateSent).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Last Update Received */}
        {stateStatus.lastUpdateReceived && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Last Received:</span>
            <span className="font-mono text-gray-300">
              {new Date(stateStatus.lastUpdateReceived).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Error */}
        {wsConnectionState.lastError && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <span className="text-red-400 block">Error:</span>
            <span className="text-red-300 text-xs">
              {wsConnectionState.lastError}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
