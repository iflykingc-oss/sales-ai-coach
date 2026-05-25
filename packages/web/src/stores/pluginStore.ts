import { create } from 'zustand';

export interface Plugin {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'domestic' | 'overseas';
  installCount: number;
  installed: boolean;
  active: boolean;
  scriptCount: number;
  scenarioCount: number;
  lastUpdated: string;
  version: string;
  rating: number;
  reviewCount: number;
}

export interface PluginScript {
  id: string;
  title: string;
  content: string;
  scenario: string;
}

export interface PluginScenario {
  id: string;
  name: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
}

interface PluginState {
  // Plugin marketplace
  plugins: Plugin[];
  setPlugins: (plugins: Plugin[]) => void;
  installPlugin: (id: string) => void;
  uninstallPlugin: (id: string) => void;
  setActivePlugin: (id: string) => void;
  togglePluginActive: (id: string) => void;

  // Active plugin
  activePlugin: Plugin | null;
  setActivePluginObj: (plugin: Plugin | null) => void;

  // Plugin detail
  selectedPlugin: Plugin | null;
  setSelectedPlugin: (plugin: Plugin | null) => void;
  pluginScripts: PluginScript[];
  setPluginScripts: (scripts: PluginScript[]) => void;
  pluginScenarios: PluginScenario[];
  setPluginScenarios: (scenarios: PluginScenario[]) => void;

  // Filter
  categoryFilter: 'all' | 'domestic' | 'overseas';
  setCategoryFilter: (filter: PluginState['categoryFilter']) => void;

  // Loading states
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const usePluginStore = create<PluginState>((set) => ({
  plugins: [],
  setPlugins: (plugins) => set({ plugins }),

  installPlugin: (id) =>
    set((state) => ({
      plugins: state.plugins.map((p) =>
        p.id === id ? { ...p, installed: true, active: true, installCount: p.installCount + 1 } : p,
      ),
    })),

  uninstallPlugin: (id) =>
    set((state) => ({
      plugins: state.plugins.map((p) =>
        p.id === id ? { ...p, installed: false, active: false, installCount: Math.max(0, p.installCount - 1) } : p,
      ),
    })),

  setActivePlugin: (id) =>
    set((state) => ({
      plugins: state.plugins.map((p) => ({
        ...p,
        active: p.id === id,
      })),
    })),

  togglePluginActive: (id) =>
    set((state) => ({
      plugins: state.plugins.map((p) =>
        p.id === id ? { ...p, active: !p.active } : p,
      ),
    })),

  activePlugin: null,
  setActivePluginObj: (plugin) => set({ activePlugin: plugin }),

  selectedPlugin: null,
  setSelectedPlugin: (plugin) => set({ selectedPlugin: plugin }),
  pluginScripts: [],
  setPluginScripts: (scripts) => set({ pluginScripts: scripts }),
  pluginScenarios: [],
  setPluginScenarios: (scenarios) => set({ pluginScenarios: scenarios }),

  categoryFilter: 'all',
  setCategoryFilter: (filter) => set({ categoryFilter: filter }),

  loading: false,
  setLoading: (loading) => set({ loading }),
}));
