import { create } from 'zustand';

interface UserState {
  user: { id: string; name: string; email: string; role: string; plan: string } | null;
  setUser: (user: UserState['user']) => void;
  clearUser: () => void;
}

function getInitialUser() {
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      if (user?.id) return user;
    }
  } catch {
    localStorage.removeItem('user');
  }
  return null;
}

export const useUserStore = create<UserState>((set) => ({
  user: getInitialUser(),
  setUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
    set({ user });
  },
  clearUser: () => {
    localStorage.removeItem('user');
    set({ user: null });
  },
}));
