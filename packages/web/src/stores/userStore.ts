import { create } from 'zustand';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface UserState {
  user: { id: string; name: string; email: string; role: string; plan: string } | null;
  setUser: (user: UserState['user']) => void;
  clearUser: () => void;
  validateSession: () => Promise<boolean>;
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
  validateSession: async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
      if (!res.ok) {
        localStorage.removeItem('user');
        set({ user: null });
        return false;
      }
      const json = await res.json();
      if (json.success && json.data?.user) {
        localStorage.setItem('user', JSON.stringify(json.data.user));
        set({ user: json.data.user });
        return true;
      }
      localStorage.removeItem('user');
      set({ user: null });
      return false;
    } catch {
      // Network error — keep cached user, don't log out
      return !!getInitialUser();
    }
  },
}));
