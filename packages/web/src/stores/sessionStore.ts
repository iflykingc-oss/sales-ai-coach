import { create } from 'zustand';

interface SessionState {
  sessions: Array<{
    id: string;
    name: string;
    status: string;
    industry: string | null;
    tags: string[];
  }>;
  activeSessionId: string | null;
  setSessions: (sessions: SessionState['sessions']) => void;
  setActiveSessionId: (id: string | null) => void;
  addSession: (session: SessionState['sessions'][0]) => void;
  removeSession: (id: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSessionId: null,
  setSessions: (sessions) => set({ sessions }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  addSession: (session) => set((state) => ({ sessions: [session, ...state.sessions] })),
  removeSession: (id) => set((state) => ({
    sessions: state.sessions.filter((s) => s.id !== id),
    activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
  })),
}));
