import { create } from 'zustand';

export type PracticeMode = 'scenario' | 'freeform' | 'special';
export type EmotionType = 'interest' | 'hesitate' | 'resist' | 'empathy';
export type CustomerState = 'idle' | 'practicing' | 'completed';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  suggestion?: string;
  emotion?: string;
  roundScore?: number;
  evaluationFeedback?: string;
}

export interface PracticeSession {
  id: string;
  mode: PracticeMode;
  scenarioId?: string;
  scenarioName?: string;
  industry?: string;
  skillFocus?: string;
  messages: ChatMessage[];
  round: number;
  maxRounds: number;
  customerEmotion: EmotionType;
  state: CustomerState;
  startedAt: number;
  completedAt?: number;
}

export interface PracticeSummary {
  sessionId: string;
  totalScore: number;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  radarScores: Record<string, number>;
}

interface PracticeState {
  session: PracticeSession | null;
  summary: PracticeSummary | null;
  isGeneratingSummary: boolean;
  isLoading: boolean;
  error: string | null;

  setSession: (session: PracticeSession) => void;
  addMessage: (message: ChatMessage) => void;
  incrementRound: () => void;
  setCustomerEmotion: (emotion: EmotionType) => void;
  completePractice: () => void;
  resetPractice: () => void;
  setSummary: (summary: PracticeSummary) => void;
  setIsGeneratingSummary: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const usePracticeStore = create<PracticeState>((set) => ({
  session: null,
  summary: null,
  isGeneratingSummary: false,
  isLoading: false,
  error: null,

  setSession: (session) => set({ session }),
  addMessage: (message) =>
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          messages: [...state.session.messages, message],
        },
      };
    }),
  incrementRound: () =>
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          round: state.session.round + 1,
        },
      };
    }),
  setCustomerEmotion: (emotion) =>
    set((state) => {
      if (!state.session) return state;
      return { session: { ...state.session, customerEmotion: emotion } };
    }),
  completePractice: () =>
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          state: 'completed',
          completedAt: Date.now(),
        },
      };
    }),
  resetPractice: () =>
    set({ session: null, summary: null, error: null, isGeneratingSummary: false }),
  setSummary: (summary) => set({ summary }),
  setIsGeneratingSummary: (loading) => set({ isGeneratingSummary: loading }),
  setError: (error) => set({ error }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
