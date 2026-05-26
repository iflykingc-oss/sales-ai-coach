import { create } from 'zustand';

export type ActivityType =
  | 'script_generate'
  | 'practice_session'
  | 'knowledge_create'
  | 'knowledge_review'
  | 'review_analyze'
  | 'plugin_install'
  | 'login'
  | 'logout';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const STORAGE_KEY = 'activities';
const MAX_ACTIVITIES = 50;

function getInitialActivities(): Activity[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Activity[];
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return [];
}

function persist(activities: Activity[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
}

interface ActivityState {
  activities: Activity[];
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
  getActivities: () => Activity[];
  clearActivities: () => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: getInitialActivities(),

  addActivity: (activity) => {
    const newActivity: Activity = {
      ...activity,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
    set((state) => {
      const updated = [newActivity, ...state.activities].slice(0, MAX_ACTIVITIES);
      persist(updated);
      return { activities: updated };
    });
  },

  getActivities: () => get().activities,

  clearActivities: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ activities: [] });
  },
}));
