-- Initial schema for startup finance worksheets
-- This creates the tables needed to store worksheet data in D1

-- Main table for storing finance worksheet data
CREATE TABLE finance_worksheets (
  id TEXT PRIMARY KEY,
  edit_key TEXT NOT NULL,
  worksheet_data TEXT NOT NULL, -- JSON serialized IConversionStateData
  version INTEGER NOT NULL DEFAULT 1,
  last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by edit_key
CREATE INDEX idx_worksheets_edit_key ON finance_worksheets(edit_key);

-- Index for faster lookups by last_modified (for cleanup/analytics)
CREATE INDEX idx_worksheets_last_modified ON finance_worksheets(last_modified);

-- Optional: Track active WebSocket sessions per worksheet
-- This can help with cleanup and monitoring
CREATE TABLE worksheet_sessions (
  worksheet_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_ping DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (worksheet_id, session_id),
  FOREIGN KEY (worksheet_id) REFERENCES finance_worksheets(id) ON DELETE CASCADE
);

-- Index for session cleanup queries
CREATE INDEX idx_sessions_last_ping ON worksheet_sessions(last_ping);
