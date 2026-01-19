import { create } from 'zustand';

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
  setState: (state: Partial<ChallengeState>) => void;
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

export const useChallengeStore = create<ChallengeStore>()((set, get) => ({
  // Initial state
  currentDay: 0,
  startDate: null,
  lastCompletedDate: null,
  totalResets: 0,
  bestStreak: 0,
  dailyLog: {},

  // Set state from storage
  setState: (state: Partial<ChallengeState>) => {
    set(state);
  },

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
}));
