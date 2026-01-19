import { create } from 'zustand';
import { Platform } from 'react-native';

// Types
export interface DailyTasks {
  diet: boolean;
  workout1: boolean;
  workout2Outdoor: boolean;
  water: boolean;
  reading: boolean;
  progressPhoto: boolean;
}

export interface DailyLogEntry extends DailyTasks {
  completedAt: string | null;
}

export interface ChallengeState {
  currentDay: number;
  startDate: string | null;
  lastCompletedDate: string | null;
  totalResets: number;
  bestStreak: number;
  dailyLog: { [dateString: string]: DailyLogEntry };
}

interface ChallengeActions {
  toggleTask: (taskKey: keyof DailyTasks) => void;
  resetChallenge: () => void;
  checkAndAdvanceDay: () => boolean;
  initializeDay: () => void;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

type ChallengeStore = ChallengeState & ChallengeActions;

export const getDateString = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

export const createEmptyDayLog = (): DailyLogEntry => ({
  diet: false,
  workout1: false,
  workout2Outdoor: false,
  water: false,
  reading: false,
  progressPhoto: false,
  completedAt: null,
});

const isAllTasksComplete = (tasks: DailyTasks): boolean => {
  return (
    tasks.diet &&
    tasks.workout1 &&
    tasks.workout2Outdoor &&
    tasks.water &&
    tasks.reading &&
    tasks.progressPhoto
  );
};

const STORAGE_KEY = '75hard-challenge-storage';

// Storage helpers
const storage = {
  getItem: async (): Promise<ChallengeState | null> => {
    try {
      let data: string | null = null;
      
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        data = window.localStorage.getItem(STORAGE_KEY);
      } else {
        // Dynamic import for AsyncStorage on native
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        data = await AsyncStorage.getItem(STORAGE_KEY);
      }
      
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.log('Error loading from storage:', e);
    }
    return null;
  },
  
  setItem: async (state: ChallengeState): Promise<void> => {
    try {
      const data = JSON.stringify(state);
      
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, data);
      } else {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        await AsyncStorage.setItem(STORAGE_KEY, data);
      }
    } catch (e) {
      console.log('Error saving to storage:', e);
    }
  },
};

const initialState: ChallengeState = {
  currentDay: 0,
  startDate: null,
  lastCompletedDate: null,
  totalResets: 0,
  bestStreak: 0,
  dailyLog: {},
};

export const useChallengeStore = create<ChallengeStore>()((set, get) => ({
  ...initialState,

  loadFromStorage: async () => {
    const stored = await storage.getItem();
    if (stored) {
      set({
        currentDay: stored.currentDay ?? 0,
        startDate: stored.startDate ?? null,
        lastCompletedDate: stored.lastCompletedDate ?? null,
        totalResets: stored.totalResets ?? 0,
        bestStreak: stored.bestStreak ?? 0,
        dailyLog: stored.dailyLog ?? {},
      });
    }
  },

  saveToStorage: async () => {
    const state = get();
    await storage.setItem({
      currentDay: state.currentDay,
      startDate: state.startDate,
      lastCompletedDate: state.lastCompletedDate,
      totalResets: state.totalResets,
      bestStreak: state.bestStreak,
      dailyLog: state.dailyLog,
    });
  },

  initializeDay: () => {
    const today = getDateString();
    const state = get();
    
    if (!state.dailyLog[today]) {
      set({
        dailyLog: {
          ...state.dailyLog,
          [today]: createEmptyDayLog(),
        },
        currentDay: state.currentDay === 0 ? 1 : state.currentDay,
        startDate: state.startDate || today,
      });
      // Save after initialization
      get().saveToStorage();
    }
  },

  toggleTask: (taskKey: keyof DailyTasks) => {
    const today = getDateString();
    const state = get();
    
    const currentDayLog = state.dailyLog[today] || createEmptyDayLog();
    const updatedLog: DailyLogEntry = {
      ...currentDayLog,
      [taskKey]: !currentDayLog[taskKey],
    };

    const allComplete = isAllTasksComplete(updatedLog);
    if (allComplete && !currentDayLog.completedAt) {
      updatedLog.completedAt = new Date().toISOString();
    } else if (!allComplete) {
      updatedLog.completedAt = null;
    }

    set({
      dailyLog: {
        ...state.dailyLog,
        [today]: updatedLog,
      },
      currentDay: state.currentDay === 0 ? 1 : state.currentDay,
      startDate: state.startDate || today,
    });
    
    // Save after toggle
    get().saveToStorage();
  },

  checkAndAdvanceDay: () => {
    const state = get();
    const today = getDateString();
    const todayLog = state.dailyLog[today];

    if (todayLog && isAllTasksComplete(todayLog) && state.lastCompletedDate !== today) {
      const newDay = state.currentDay + 1;
      const newBestStreak = Math.max(state.bestStreak, state.currentDay);
      
      set({
        currentDay: newDay > 75 ? 75 : newDay,
        lastCompletedDate: today,
        bestStreak: newBestStreak,
      });
      
      // Save after advancing
      get().saveToStorage();
      return true;
    }
    return false;
  },

  resetChallenge: () => {
    const state = get();
    const newBestStreak = Math.max(state.bestStreak, state.currentDay);
    
    set({
      currentDay: 0,
      startDate: null,
      lastCompletedDate: null,
      totalResets: state.totalResets + 1,
      bestStreak: newBestStreak,
      dailyLog: {},
    });
    
    // Save after reset
    get().saveToStorage();
  },
}));
