import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  getTodaysTasks: () => DailyLogEntry;
  checkAndAdvanceDay: () => boolean;
  initializeDay: () => void;
}

type ChallengeStore = ChallengeState & ChallengeActions;

const getDateString = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

const createEmptyDayLog = (): DailyLogEntry => ({
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
        const { dailyLog, currentDay, startDate } = get();
        
        if (!dailyLog[today]) {
          set({
            dailyLog: {
              ...dailyLog,
              [today]: createEmptyDayLog(),
            },
            // Start challenge if not started
            currentDay: currentDay === 0 ? 1 : currentDay,
            startDate: startDate || today,
          });
        }
      },

      // Get today's tasks
      getTodaysTasks: () => {
        const today = getDateString();
        const { dailyLog } = get();
        return dailyLog[today] || createEmptyDayLog();
      },

      // Toggle a task
      toggleTask: (taskKey: keyof DailyTasks) => {
        const today = getDateString();
        const { dailyLog, currentDay, startDate } = get();
        
        const currentDayLog = dailyLog[today] || createEmptyDayLog();
        const updatedLog = {
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
            ...dailyLog,
            [today]: updatedLog,
          },
          // Start challenge if not started
          currentDay: currentDay === 0 ? 1 : currentDay,
          startDate: startDate || today,
        });
      },

      // Check if day should advance and do it
      checkAndAdvanceDay: () => {
        const { dailyLog, currentDay, bestStreak, lastCompletedDate } = get();
        const today = getDateString();
        const todayLog = dailyLog[today];

        if (todayLog && isAllTasksComplete(todayLog) && lastCompletedDate !== today) {
          const newDay = currentDay + 1;
          const newBestStreak = Math.max(bestStreak, currentDay);
          
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
        const { totalResets, currentDay, bestStreak } = get();
        const newBestStreak = Math.max(bestStreak, currentDay);
        
        set({
          currentDay: 0,
          startDate: null,
          lastCompletedDate: null,
          totalResets: totalResets + 1,
          bestStreak: newBestStreak,
          dailyLog: {},
        });
      },
    }),
    {
      name: '75hard-challenge-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
