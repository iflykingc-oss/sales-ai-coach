import { create } from 'zustand';

interface UserState {
  user: { id: string; name: string; email: string; role: string; plan: string } | null;
  setUser: (user: UserState['user']) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
