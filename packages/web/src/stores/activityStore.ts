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

const MAX_ACTIVITIES = 50;

interface ActivityState {
  activities: Activity[];
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
  getActivities: () => Activity[];
  clearActivities: () => void;
}

// Privacy: activity log is ephemeral (in-memory only, not persisted)
export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],

  addActivity: (activity) => {
    const newActivity: Activity = {
      ...activity,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({
      activities: [newActivity, ...state.activities].slice(0, MAX_ACTIVITIES),
    }));
  },

  getActivities: () => get().activities,

  clearActivities: () => {
    set({ activities: [] });
  },
}));
