import { create } from 'zustand';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  status: 'online' | 'offline' | 'away';
  joinedAt: string;
  stats: {
    scriptsGenerated: number;
    practiceScore: number;
    sessionsCompleted: number;
    growthTrend: number[];
  };
}

export interface TeamTask {
  id: string;
  title: string;
  type: 'practice' | 'scenario';
  assigneeId: string;
  assigneeName: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
  createdAt: string;
  description?: string;
}

export interface SharedScript {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  content: string;
  industry: string;
  likes: number;
  likedByCurrentUser: boolean;
  approved: boolean;
  createdAt: string;
}

export interface TeamScenario {
  name: string;
  weakness: number;
}

interface TeamState {
  // Members
  members: TeamMember[];
  setMembers: (members: TeamMember[]) => void;
  updateMemberStatus: (id: string, status: TeamMember['status']) => void;

  // Tasks
  tasks: TeamTask[];
  setTasks: (tasks: TeamTask[]) => void;
  addTask: (task: TeamTask) => void;
  updateTaskStatus: (id: string, status: TeamTask['status']) => void;

  // Script sharing
  sharedScripts: SharedScript[];
  setSharedScripts: (scripts: SharedScript[]) => void;
  toggleScriptLike: (id: string) => void;
  approveScript: (id: string) => void;

  // Team stats
  teamStats: {
    totalMembers: number;
    activeToday: number;
    totalScriptsGenerated: number;
    avgPracticeScore: number;
  };
  setTeamStats: (stats: TeamState['teamStats']) => void;

  // Weak scenarios
  weakScenarios: TeamScenario[];
  setWeakScenarios: (scenarios: TeamScenario[]) => void;

  // Loading states
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useTeamStore = create<TeamState>((set) => ({
  members: [],
  setMembers: (members) => set({ members }),
  updateMemberStatus: (id, status) =>
    set((state) => ({
      members: state.members.map((m) => (m.id === id ? { ...m, status } : m)),
    })),

  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTaskStatus: (id, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    })),

  sharedScripts: [],
  setSharedScripts: (scripts) => set({ sharedScripts: scripts }),
  toggleScriptLike: (id) =>
    set((state) => ({
      sharedScripts: state.sharedScripts.map((s) =>
        s.id === id
          ? { ...s, likedByCurrentUser: !s.likedByCurrentUser, likes: s.likedByCurrentUser ? s.likes - 1 : s.likes + 1 }
          : s,
      ),
    })),
  approveScript: (id) =>
    set((state) => ({
      sharedScripts: state.sharedScripts.map((s) =>
        s.id === id ? { ...s, approved: true } : s,
      ),
    })),

  teamStats: { totalMembers: 0, activeToday: 0, totalScriptsGenerated: 0, avgPracticeScore: 0 },
  setTeamStats: (stats) => set({ teamStats: stats }),

  weakScenarios: [],
  setWeakScenarios: (scenarios) => set({ weakScenarios: scenarios }),

  loading: false,
  setLoading: (loading) => set({ loading }),
}));
