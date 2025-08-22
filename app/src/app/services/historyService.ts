import { generateDockerStyleName } from "@/utils/names";

export interface HistoryEntry {
  objectId: string;
  name: string;
  lastAccessed: number; // timestamp
  editKey?: string; // optional, for full access
}

const HISTORY_KEY = "history";
const MAX_HISTORY_ENTRIES = 50;

/**
 * Add or update a worksheet in history
 */
export function addToHistory(objectId: string, name?: string, editKey?: string): void {
  if (!objectId) return;
  
  const history = getHistory();
  
  // Generate name if not provided
  const worksheetName = name || generateDockerStyleName(objectId);
  
  // Find existing entry
  const existingIndex = history.findIndex(entry => entry.objectId === objectId);
  
  if (existingIndex !== -1) {
    // Update existing entry
    history[existingIndex] = {
      ...history[existingIndex],
      name: worksheetName,
      lastAccessed: Date.now(),
      ...(editKey && { editKey })
    };
  } else {
    // Add new entry
    history.push({
      objectId,
      name: worksheetName,
      lastAccessed: Date.now(),
      ...(editKey && { editKey })
    });
  }
  
  // Sort by most recent first
  history.sort((a, b) => b.lastAccessed - a.lastAccessed);
  
  // Limit to max entries
  const trimmedHistory = history.slice(0, MAX_HISTORY_ENTRIES);
  
  // Save to localStorage
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error("Failed to save history to localStorage:", error);
  }
}

/**
 * Get sorted, deduped list of worksheets from history
 */
export function getHistory(): HistoryEntry[] {
  try {
    const historyJson = localStorage.getItem(HISTORY_KEY);
    if (!historyJson) return [];
    
    const history = JSON.parse(historyJson) as HistoryEntry[];
    
    // Ensure data integrity
    return history.filter(entry => 
      entry.objectId && 
      typeof entry.objectId === 'string' &&
      typeof entry.lastAccessed === 'number'
    );
  } catch (error) {
    console.error("Failed to load history from localStorage:", error);
    return [];
  }
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error("Failed to clear history from localStorage:", error);
  }
}

/**
 * Remove specific entry from history
 */
export function removeFromHistory(objectId: string): void {
  const history = getHistory();
  const filteredHistory = history.filter(entry => entry.objectId !== objectId);
  
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filteredHistory));
  } catch (error) {
    console.error("Failed to update history in localStorage:", error);
  }
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  
  if (seconds < 60) {
    return "Just now";
  } else if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (days === 1) {
    return "Yesterday";
  } else if (days < 7) {
    return `${days} days ago`;
  } else if (weeks < 4) {
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  } else if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  } else {
    return new Date(timestamp).toLocaleDateString();
  }
}

/**
 * Format timestamp to full date/time string
 */
export function formatFullDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
