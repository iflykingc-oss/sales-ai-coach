import { create } from 'zustand';

export interface ConversationUpload {
  id: string;
  fileName: string;
  content: string;
  uploadedAt: Date;
}

export interface ReviewReport {
  id: string;
  date: string;
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  actionItems: string[];
  recommendations?: string[];
  radarScores: Record<string, number>;
  scenarioType?: string;
}

export interface ReviewHistoryItem {
  id: string;
  date: string;
  overallScore: number;
  scenarioType?: string;
  summary: string;
}

export type ReviewWorkflowState = 'idle' | 'uploading' | 'generating' | 'viewing';

interface ReviewStoreState {
  uploads: ConversationUpload[];
  report: ReviewReport | null;
  history: ReviewHistoryItem[];
  state: ReviewWorkflowState;
  error: string | null;
  selectedDate: string | null;
  selectedScenario: string | null;

  setUploads: (uploads: ConversationUpload[]) => void;
  addUpload: (upload: ConversationUpload) => void;
  removeUpload: (id: string) => void;
  setReport: (report: ReviewReport) => void;
  setHistory: (history: ReviewHistoryItem[]) => void;
  setState: (state: ReviewWorkflowState) => void;
  setError: (error: string | null) => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedScenario: (scenario: string | null) => void;
  reset: () => void;
}

export const useReviewStore = create<ReviewStoreState>((set) => ({
  uploads: [],
  report: null,
  history: [],
  state: 'idle',
  error: null,
  selectedDate: null,
  selectedScenario: null,

  setUploads: (uploads: ConversationUpload[]) => set({ uploads }),
  addUpload: (upload: ConversationUpload) => set((s) => ({ uploads: [...s.uploads, upload] })),
  removeUpload: (id: string) =>
    set((s) => ({ uploads: s.uploads.filter((u: ConversationUpload) => u.id !== id) })),
  setReport: (report: ReviewReport) => set({ report, state: 'viewing' as ReviewWorkflowState }),
  setHistory: (history: ReviewHistoryItem[]) => set({ history }),
  setState: (state: ReviewWorkflowState) => set({ state }),
  setError: (error: string | null) => set({ error }),
  setSelectedDate: (date: string | null) => set({ selectedDate: date }),
  setSelectedScenario: (scenario: string | null) => set({ selectedScenario: scenario }),
  reset: () => set({ uploads: [], report: null, state: 'idle' as ReviewWorkflowState, error: null }),
}));
