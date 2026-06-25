import { logger } from '@/utils/logger';
import { create } from 'zustand';
import { api } from '@/services/api';
import { toast } from '@/hooks/useToast';
import type { Achievement } from '@sales-ai-coach/shared';

export interface AchievementWithStatus extends Achievement {
  unlocked: boolean;
}

export interface UserProgressData {
  totalXp: number;
  level: number;
  practiceSessions: number;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  unlockedAchievements: string[];
  skillScores: Record<string, number>;
  bestScores: Record<string, number>;
  currentLevel: {
    level: number;
    name: string;
    xpRequired: number;
    icon: string;
  };
  nextLevel: {
    level: number;
    name: string;
    xpRequired: number;
    icon: string;
  } | null;
  xpForNextLevel: number;
}

export interface NewlyUnlockedAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  xp: number;
}

interface AchievementState {
  achievements: AchievementWithStatus[];
  progress: UserProgressData | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;

  // Actions
  fetchAchievements: () => Promise<void>;
  fetchProgress: () => Promise<void>;
  checkNewAchievements: (previousUnlocked: string[]) => Promise<NewlyUnlockedAchievement[]>;
  showUnlockNotifications: (newlyUnlocked: NewlyUnlockedAchievement[]) => void;
}

// Privacy: achievement data is ephemeral (fetched from API, not persisted locally)
export const useAchievementStore = create<AchievementState>()(
  (set) => ({
    achievements: [],
    progress: null,
    isLoading: false,
    error: null,
    lastFetchedAt: null,

    fetchAchievements: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.get('/achievements');
        const data = response.data?.data || response.data;
        set({
          achievements: Array.isArray(data) ? data : [],
          isLoading: false,
          lastFetchedAt: Date.now(),
        });
      } catch (err) {
        logger.error('Failed to fetch achievements:', err);
        set({ error: 'Failed to load achievements', isLoading: false });
      }
    },

    fetchProgress: async () => {
      try {
        const response = await api.get('/achievements/progress');
        const data = response.data?.data || response.data;
        set({ progress: data });
      } catch (err) {
        logger.error('Failed to fetch progress:', err);
      }
    },

    checkNewAchievements: async (previousUnlocked: string[]) => {
      try {
        const response = await api.post('/achievements/check', { previousUnlocked });
        const data = response.data?.data || response.data;
        return data?.newlyUnlocked || [];
      } catch (err) {
        logger.error('Failed to check achievements:', err);
        return [];
      }
    },

    showUnlockNotifications: (newlyUnlocked: NewlyUnlockedAchievement[]) => {
      for (const achievement of newlyUnlocked) {
        toast.success(`成就解锁: ${achievement.name}`, {
          description: `${achievement.icon} ${achievement.description} (+${achievement.xp} XP)`,
          duration: 6000,
        });
      }
    },
  }),
);
