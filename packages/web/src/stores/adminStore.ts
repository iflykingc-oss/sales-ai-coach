import { create } from 'zustand';

export interface AdminStats {
  totalUsers: number;
  dailyActiveUsers: number;
  totalScriptsGenerated: number;
  dailyScriptsGenerated: number;
  modelUsage: { name: string; calls: number; percentage: number }[];
  userGrowthTrend: number[];
  scriptUsageTrend: number[];
  topIndustries: { name: string; count: number }[];
}

export interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  source: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  content?: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  status: 'active' | 'inactive' | 'error';
  temperature: number;
  maxTokens: number;
  repetitionPenalty: number;
  apiKey: string;
  baseUrl?: string;
  modelId?: string;
  usageQuota: number;
  usageCurrent: number;
  alertThreshold: number;
}

export interface PluginAdmin {
  id: string;
  name: string;
  version: string;
  installCount: number;
  activeRate: number;
  reviewCount: number;
  lastUpdated: string;
  versions: { version: string; date: string; changelog: string }[];
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'disabled';
  lastLogin: string;
  plan: string;
  createdAt: string;
}

export type AdminTab = 'stats' | 'users' | 'knowledge' | 'company-knowledge' | 'models' | 'announcements' | 'sync' | 'plugins' | 'settings' | 'retrieval-logs';

interface AdminState {
  // Active tab
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;

  // Statistics
  stats: AdminStats | null;
  setStats: (stats: AdminStats) => void;

  // Knowledge management
  knowledgeItems: KnowledgeItem[];
  setKnowledgeItems: (items: KnowledgeItem[]) => void;
  approveKnowledge: (id: string) => void;
  rejectKnowledge: (id: string) => void;
  updateKnowledge: (id: string, updates: Partial<KnowledgeItem>) => void;
  deleteKnowledge: (id: string) => void;

  // Model configuration
  models: ModelConfig[];
  setModels: (models: ModelConfig[]) => void;
  updateModel: (id: string, updates: Partial<ModelConfig>) => void;
  addModel: (model: ModelConfig) => void;
  deleteModel: (id: string) => void;

  // Plugin management
  adminPlugins: PluginAdmin[];
  setAdminPlugins: (plugins: PluginAdmin[]) => void;
  addAdminPlugin: (plugin: PluginAdmin) => void;

  // System settings
  systemName: string;
  setSystemName: (name: string) => void;
  systemUsers: SystemUser[];
  setSystemUsers: (users: SystemUser[]) => void;
  toggleUserStatus: (id: string) => void;
  updateUserPlan: (id: string, plan: string) => void;

  // Loading
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  activeTab: 'stats',
  setActiveTab: (tab) => set({ activeTab: tab }),

  stats: null,
  setStats: (stats) => set({ stats }),

  knowledgeItems: [],
  setKnowledgeItems: (items) => set({ knowledgeItems: items }),
  approveKnowledge: (id) =>
    set((state) => ({
      knowledgeItems: state.knowledgeItems.map((item) =>
        item.id === id ? { ...item, status: 'approved' } : item,
      ),
    })),
  rejectKnowledge: (id) =>
    set((state) => ({
      knowledgeItems: state.knowledgeItems.map((item) =>
        item.id === id ? { ...item, status: 'rejected' } : item,
      ),
    })),
  updateKnowledge: (id, updates) =>
    set((state) => ({
      knowledgeItems: state.knowledgeItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    })),
  deleteKnowledge: (id) =>
    set((state) => ({
      knowledgeItems: state.knowledgeItems.filter((item) => item.id !== id),
    })),

  models: [],
  setModels: (models) => set({ models }),
  updateModel: (id, updates) =>
    set((state) => ({
      models: state.models.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  addModel: (model) =>
    set((state) => ({
      models: [...state.models, model],
    })),
  deleteModel: (id) =>
    set((state) => ({
      models: state.models.filter((m) => m.id !== id),
    })),

  adminPlugins: [],
  setAdminPlugins: (plugins) => set({ adminPlugins: plugins }),
  addAdminPlugin: (plugin) => set((state) => ({ adminPlugins: [plugin, ...state.adminPlugins] })),

  systemName: '销冠AI教练',
  setSystemName: (name) => set({ systemName: name }),

  systemUsers: [],
  setSystemUsers: (users) => set({ systemUsers: users }),
  toggleUserStatus: (id) =>
    set((state) => ({
      systemUsers: state.systemUsers.map((u) =>
        u.id === id ? { ...u, status: u.status === 'active' ? 'disabled' : 'active' } : u,
      ),
    })),
  updateUserPlan: (id, plan) =>
    set((state) => ({
      systemUsers: state.systemUsers.map((u) =>
        u.id === id ? { ...u, plan } : u,
      ),
    })),

  loading: false,
  setLoading: (loading) => set({ loading }),
}));
