import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export function getInstalledVersion(pluginId: string): string | null {
  try {
    const installed = JSON.parse(localStorage.getItem('installed-plugins') || '{}');
    return installed[pluginId]?.version ?? null;
  } catch {
    return null;
  }
}

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
  fetchPlugins: () => Promise<void>;
  installPluginPersisted: (id: string) => Promise<void>;
  uninstallPluginPersisted: (id: string) => Promise<void>;
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

export const usePluginStore = create<PluginState>()(
  persist(
    (set, get) => ({
      plugins: [],
      setPlugins: (plugins) => set({ plugins }),

      fetchPlugins: async () => {
        set({ loading: true });
        try {
          const res = await fetch('/api/plugins/search', { credentials: 'include' });
          if (!res.ok) throw new Error('API fetch failed');
          const json = await res.json();
          if (json.success && json.data?.length > 0) {
            set({ plugins: json.data.map((p: any) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              icon: p.icon || '📦',
              category: p.category,
              installCount: p.installCount || 0,
              installed: false,
              active: false,
              scriptCount: p.scriptCount || 0,
              scenarioCount: p.scenarioCount || 0,
              lastUpdated: p.lastUpdated || '',
              version: p.version || '1.0.0',
              rating: p.rating || 0,
              reviewCount: p.reviewCount || 0,
            })) });
            return;
          }
        } catch {
          // Fallback handled below
        }
        // Fallback: load from hardcoded definitions
        const { industryDefinitions } = await import('@/data/pluginContent');
        const { plugins: existingPlugins } = get();
        const existingMap = new Map(existingPlugins.map((p) => [p.id, p]));
        const fallback = industryDefinitions.map((def) => {
          const existing = existingMap.get(def.id);
          return {
            id: def.id,
            name: def.name,
            description: def.description,
            icon: def.icon,
            category: def.category,
            installCount: def.installCount,
            installed: existing?.installed ?? false,
            active: existing?.active ?? false,
            scriptCount: def.scriptCount,
            scenarioCount: def.scenarioCount,
            lastUpdated: def.lastUpdated,
            version: def.version,
            rating: def.rating,
            reviewCount: def.reviewCount,
          };
        });
        set({ plugins: fallback, loading: false });
      },

      installPluginPersisted: async (id: string) => {
        try {
          await fetch('/api/plugins/install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ pluginId: id }),
          });
        } catch {
          // API unavailable, local-only
        }
        set((state) => ({
          plugins: state.plugins.map((p) =>
            p.id === id ? { ...p, installed: true, active: true, installCount: p.installCount + 1 } : p,
          ),
        }));
        // Save installed version to localStorage for update detection
        const plugin = get().plugins.find((p) => p.id === id);
        if (plugin) {
          const installed = JSON.parse(localStorage.getItem('installed-plugins') || '{}');
          installed[id] = { version: plugin.version, installedAt: Date.now() };
          localStorage.setItem('installed-plugins', JSON.stringify(installed));
        }
      },

      uninstallPluginPersisted: async (id: string) => {
        try {
          await fetch(`/api/plugins/${id}/uninstall`, {
            method: 'POST',
            credentials: 'include',
          });
        } catch {
          // API unavailable, local-only
        }
        set((state) => ({
          plugins: state.plugins.map((p) =>
            p.id === id ? { ...p, installed: false, active: false, installCount: Math.max(0, p.installCount - 1) } : p,
          ),
        }));
        const installed = JSON.parse(localStorage.getItem('installed-plugins') || '{}');
        delete installed[id];
        localStorage.setItem('installed-plugins', JSON.stringify(installed));
      },

      togglePluginActive: (id) =>
        set((state) => ({
          plugins: state.plugins.map((p) =>
            p.id === id ? { ...p, active: true } : { ...p, active: false },
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
    }),
    { name: 'plugin-state' },
  ),
);
