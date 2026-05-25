import { create } from 'zustand';

export interface ScriptVariant {
  style: string;
  content: string;
}

export interface ScriptStateData {
  speech_styles: ScriptVariant[];
  reasoning: string[];
  pitfalls: Array<{ action: string; reason: string }>;
  knowledge_source: string;
  confidence_score: number;
}

export interface ScriptFeedbackState {
  sessionId: string | null;
  activeStyle: string;
  isGenerating: boolean;
  error: string | null;
  currentScript: ScriptStateData | null;
  generatedScriptIds: string[];
  feedbackSubmitted: Record<string, boolean>;
  setActiveStyle: (style: string) => void;
  setSessionId: (sessionId: string | null) => void;
  setCurrentScript: (data: ScriptStateData | null) => void;
  setGeneratedScriptIds: (ids: string[]) => void;
  markFeedbackSubmitted: (scriptId: string) => void;
  reset: () => void;
}

export const useScriptStore = create<ScriptFeedbackState>((set) => ({
  sessionId: null,
  activeStyle: 'empathy',
  isGenerating: false,
  error: null,
  currentScript: null,
  generatedScriptIds: [],
  feedbackSubmitted: {},
  setActiveStyle: (style) => set({ activeStyle: style }),
  setSessionId: (sessionId) => set({ sessionId }),
  setCurrentScript: (data) => set({ currentScript: data }),
  setGeneratedScriptIds: (ids) => set({ generatedScriptIds: ids }),
  markFeedbackSubmitted: (scriptId) =>
    set((state) => ({
      feedbackSubmitted: { ...state.feedbackSubmitted, [scriptId]: true },
    })),
  reset: () =>
    set({
      sessionId: null,
      activeStyle: 'empathy',
      isGenerating: false,
      error: null,
      currentScript: null,
      generatedScriptIds: [],
      feedbackSubmitted: {},
    }),
}));
