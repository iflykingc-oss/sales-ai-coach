import { create } from 'zustand';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
}

interface UserState {
  user: User | null;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  validateSession: () => Promise<boolean>;
}

function isValidUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as User).id === 'string' &&
    typeof (obj as User).email === 'string' &&
    typeof (obj as User).role === 'string' &&
    ['USER', 'ADMIN', 'TEAM_OWNER'].includes((obj as User).role)
  );
}

function getInitialUser(): User | null {
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      if (isValidUser(user)) return user;
    }
  } catch {
    // corrupted data
  }
  localStorage.removeItem('user');
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
      // /auth/me returns { success: true, data: user } (not data.user)
      const userData = json.data?.user || json.data;
      if (json.success && isValidUser(userData)) {
        localStorage.setItem('user', JSON.stringify(userData));
        set({ user: userData });
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
