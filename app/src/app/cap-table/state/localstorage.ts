import { IConversionStateData } from "@/cap-table/state/ConversionState";

// Simply store the most recent states in local storage

const MAX_RECENT_STATES = 10;
const RECENT_STATES_KEY = "recent_v6";

// Some browsers don't support local storage with certain settings, so we need to mock it
// This breaks the recent state functionality, but it's better than nothing
// Safari, I'm looking at you
const mockLocalStorageData: { [key: string]: string } = {};
const mockLocalStorage = {
  getItem: (key: string): string | null => {
    return mockLocalStorageData[key] ?? null;
  },
  setItem: (key: string, value: string) => {
    mockLocalStorageData[key] = value;
  },
  removeItem: (key: string) => {
    delete mockLocalStorageData[key];
  }
};

const hasLocalStorage = typeof window !== "undefined" && window.localStorage !== undefined;
export const localStorageWorks = (() => {
  if (!hasLocalStorage) return false
  window.localStorage.setItem("safariTest", "1")
  return window.localStorage.getItem("safariTest") === "1";
})()

const localStorage = localStorageWorks ? window.localStorage : mockLocalStorage;

export type LocalStorageConversionStateData = {
  id: string
  conversionState: IConversionStateData;
  createdAt: number;
  updatedAt: number;
}

// Get the most recent states from local storage
export const getRecentStates = (): LocalStorageConversionStateData[] => {
  const recentSerialized = localStorage.getItem(RECENT_STATES_KEY)
  let recents: LocalStorageConversionStateData[] = [];
  if (recentSerialized !== null && recentSerialized.length > 0) {
    try {
      try {
        const items = JSON.parse(recentSerialized) as LocalStorageConversionStateData[];
        recents = items.sort((a, b) => b.updatedAt - a.updatedAt);
      } catch (e) {
        // If we have an error parsing, we should remove the item in order to start fresh
        console.error("Error parsing states from local storage", e);
        localStorage.removeItem(RECENT_STATES_KEY);
      }
    } catch (e) {
      console.error("Error parsing states from local storage", e);
    }
  }
  return recents
}

// Update or create a recent state in local storage
export const updateRecentStates = (id: string, state:IConversionStateData) => {
  // From oldest to newest
  const recents = getRecentStates().sort((a, b) => a.updatedAt - b.updatedAt);
  const idx = recents.findIndex((s) => id === s.id);
  if (idx !== -1) {
    recents[idx] = {
      ...recents[idx],
      conversionState: state,
      updatedAt: Date.now(),
    }
    localStorage.setItem(RECENT_STATES_KEY, JSON.stringify(recents));
  } else {
    const newRecent = {
      id,
      conversionState: state,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    recents.push(newRecent);
    if (recents.length > MAX_RECENT_STATES) {
      recents.shift();
    }
    localStorage.setItem(RECENT_STATES_KEY, JSON.stringify(recents));
  }
}

// If we show up with nothing, find the most recent state, or return undefined
export const findRecentState = (id: string): IConversionStateData | undefined => {
  const recents = getRecentStates();
  const found = recents.find((s) => s.id === id);
  return found?.conversionState;
}


// If we show up with nothing, find the most recent state, or return undefined
export const getRecentState = (): IConversionStateData | undefined => {
  const recents = getRecentStates();
  if (recents.length > 0) {
    const mostRecent = recents.sort((a, b) => b.updatedAt - a.updatedAt)[0];
    return mostRecent.conversionState
  }
  return undefined;
}
