import { create } from 'zustand';

export interface CustomScenario {
  id: string;
  name: string;
  industry: string;
  description: string;
  customerPersona: string;
  objectionTypes: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  createdAt: string;
}

interface CustomScenarioState {
  scenarios: CustomScenario[];
  addScenario: (scenario: CustomScenario) => void;
  removeScenario: (id: string) => void;
  updateScenario: (id: string, updates: Partial<CustomScenario>) => void;
  getScenariosByIndustry: (industry: string) => CustomScenario[];
}

// Privacy: custom scenarios are ephemeral (in-memory only)
export const useCustomScenarioStore = create<CustomScenarioState>()(
  (set, get) => ({
    scenarios: [],
    addScenario: (scenario) =>
      set((state) => ({ scenarios: [...state.scenarios, scenario] })),
    removeScenario: (id) =>
      set((state) => ({ scenarios: state.scenarios.filter((s) => s.id !== id) })),
    updateScenario: (id, updates) =>
      set((state) => ({
        scenarios: state.scenarios.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      })),
    getScenariosByIndustry: (industry) =>
      get().scenarios.filter((s) => s.industry === industry),
  }),
);
