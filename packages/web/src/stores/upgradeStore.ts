import { create } from 'zustand';

interface UpgradeState {
  open: boolean;
  feature?: string;
  limit?: number;
  resetAt?: string;
  showUpgrade: (params: { feature?: string; limit?: number; resetAt?: string }) => void;
  hideUpgrade: () => void;
}

export const useUpgradeStore = create<UpgradeState>((set) => ({
  open: false,
  feature: undefined,
  limit: undefined,
  resetAt: undefined,
  showUpgrade: ({ feature, limit, resetAt }) =>
    set({ open: true, feature, limit, resetAt }),
  hideUpgrade: () =>
    set({ open: false, feature: undefined, limit: undefined, resetAt: undefined }),
}));
