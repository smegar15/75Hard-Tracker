import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Simple storage wrapper that works on both platforms
const getStorage = (): StateStorage => {
  // For web, use localStorage directly
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    return {
      getItem: (name: string): string | null => {
        return window.localStorage.getItem(name);
      },
      setItem: (name: string, value: string): void => {
        window.localStorage.setItem(name, value);
      },
      removeItem: (name: string): void => {
        window.localStorage.removeItem(name);
      },
    };
  }
  
  // For native, use AsyncStorage with sync wrapper
  return {
    getItem: async (name: string): Promise<string | null> => {
      return await AsyncStorage.getItem(name);
    },
    setItem: async (name: string, value: string): Promise<void> => {
      await AsyncStorage.setItem(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
      await AsyncStorage.removeItem(name);
    },
  };
};

export const useChallengeStore = create<ChallengeStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentDay: 0,
      startDate: null,
      lastCompletedDate: null,
      totalResets: 0,
      bestStreak: 0,
      dailyLog: {},

      // Initialize today's entry if not exists
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
        }
      },

      // Toggle a task
      toggleTask: (taskKey: keyof DailyTasks) => {
        const today = getDateString();
        const state = get();
        
        const currentDayLog = state.dailyLog[today] || createEmptyDayLog();
        const updatedLog: DailyLogEntry = {
          ...currentDayLog,
          [taskKey]: !currentDayLog[taskKey],
        };

        // Check if all tasks are now complete
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
      },

      // Check if day should advance and do it
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
          return true;
        }
        return false;
      },

      // Reset challenge
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
      },
    }),
    {
      name: '75hard-challenge-storage',
      storage: createJSONStorage(() => getStorage()),
      skipHydration: false,
    }
  )
);
