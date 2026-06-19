import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PracticeMode = 'scenario' | 'freeform' | 'special' | 'objection_training';
export type EmotionType = 'interest' | 'hesitate' | 'resist' | 'empathy';
export type CustomerState = 'idle' | 'practicing' | 'completed';

export interface CoachingMoment {
  user_quote: string;
  issue: string;
  improve: string;
  dimension: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  suggestion?: string;
  emotion?: string;
  roundScore?: number;
  evaluationFeedback?: string;
  coachingMoments?: CoachingMoment[];
  objectionTraining?: boolean;
  objectionText?: string;
  objectionTypes?: string[];
}

export interface PracticeSession {
  id: string;
  mode: PracticeMode;
  scenarioId?: string;
  scenarioName?: string;
  industry?: string;
  skillFocus?: string;
  logicFramework?: string;
  logicStage?: string;
  detectedStage?: string;
  difficulty?: string;
  archetypeName?: string;
  linkedSessionId?: string;
  linkedScriptId?: string;
  scriptStyle?: string;
  coachingDirectives?: { pacingAndTone?: string; microBehaviors?: string };
  messages: ChatMessage[];
  round: number;
  maxRounds: number;
  customerEmotion: EmotionType;
  state: CustomerState;
  startedAt: number;
  completedAt?: number;
  // Talk-time tracking
  userCharCount?: number;
  assistantCharCount?: number;
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
  recentScenarioIds: string[];

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
  addRecentScenario: (scenarioId: string) => void;
  setLogicFramework: (frameworkId: string) => void;
  setDetectedStage: (stage: string) => void;
}

export const usePracticeStore = create<PracticeState>()(
  persist(
    (set) => ({
      session: null,
      summary: null,
      isGeneratingSummary: false,
      isLoading: false,
      error: null,
      recentScenarioIds: [],

      setSession: (session) => set({ session }),
      addMessage: (message) =>
        set((state) => {
          if (!state.session) return state;
          // Track character counts for talk-time ratio
          const charCount = message.content.length;
          const isUser = message.role === 'user';
          return {
            session: {
              ...state.session,
              messages: [...state.session.messages, message],
              userCharCount: (state.session.userCharCount || 0) + (isUser ? charCount : 0),
              assistantCharCount: (state.session.assistantCharCount || 0) + (!isUser ? charCount : 0),
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
      addRecentScenario: (scenarioId) =>
        set((state) => {
          const recent = [scenarioId, ...state.recentScenarioIds.filter((id) => id !== scenarioId)].slice(0, 10);
          return { recentScenarioIds: recent };
        }),
      setLogicFramework: (frameworkId) =>
        set((state) => {
          if (!state.session) return state;
          return { session: { ...state.session, logicFramework: frameworkId } };
        }),
      setDetectedStage: (stage) =>
        set((state) => {
          if (!state.session) return state;
          return { session: { ...state.session, detectedStage: stage } };
        }),
    }),
    {
      name: 'practice-state',
      partialize: (state) => ({
        session: state.session ? {
          ...state.session,
          messages: state.session.messages?.slice(-20) || [],
        } : null,
      }),
    },
  ),
);
