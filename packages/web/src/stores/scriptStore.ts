import { create } from 'zustand';

export interface ScriptVariant {
  style: string;
  content: string;
  logic?: string;
}

export interface PainAnalysis {
  likely_pains: string[];
  hidden_needs: string[];
  decision_factors: string[];
}

export interface ScenarioBreakdown {
  stage: string;
  objective: string;
  next_step: string;
}

export interface ObjectionHandling {
  likely_objection: string;
  response: string;
  principle: string;
}

export interface ClosingStrategy {
  signal: string;
  method: string;
  script: string;
}

export interface FrameworkAnalysis {
  frameworkId: string;
  frameworkName: string;
  analysis: Record<string, unknown>;
  // Extended fields from AI service
  detectedFrameworks?: string[];
  frameworkUsageQuality?: number;
  stageProgression?: string;
  frameworkStrengths?: string[];
  frameworkGaps?: string[];
  suggestedFrameworks?: string[];
}

// 新结构 - 战术执行路径
export interface TacticalExecutionPath {
  pathType: '共情版' | '直爽版' | '专业版';
  strategicLever: string;
  verbalScript: string;
  coachingDirectives?: {
    pacingAndTone: string;
    microBehaviors: string;
  };
}

// 新结构 - 买家画像分析
export interface BuyerPersonaAnalysis {
  targetStakeholder: string;
  hiddenDriver: string;
}

// 新结构 - 多阶段模拟
export interface MultiStageSimulation {
  expectedPushback: string;
  counterStrategy: string;
  nextProgressiveMove: string;
}

export interface ScriptStateData {
  // 新结构字段
  detectedBusinessMode?: 'B2B' | 'B2C';
  salesLifecycleStage?: string;
  buyerPersonaAnalysis?: BuyerPersonaAnalysis;
  tacticalExecutionPaths?: TacticalExecutionPath[];
  multiStageSimulation?: MultiStageSimulation;

  // 兼容旧结构
  speechStyles?: ScriptVariant[];

  // 通用字段
  reasoning: string[];
  pitfalls: Array<{ action: string; reason: string }>;
  knowledgeSource: string;
  confidenceScore: number;
  painAnalysis?: PainAnalysis;
  scenarioBreakdown?: ScenarioBreakdown;
  followUpQuestions?: string[];
  objectionHandling?: ObjectionHandling[];
  closingStrategy?: ClosingStrategy;
  // Framework analysis fields
  swotAnalysis?: Record<string, unknown>;
  scenario5w2h?: Record<string, unknown>;
  aidaFlow?: Record<string, unknown>;
  fabMapping?: Record<string, unknown>;
  bantQualification?: Record<string, unknown>;
  meddicAnalysis?: Record<string, unknown>;
  porterForces?: Record<string, unknown>;
  journeyStage?: Record<string, unknown>;
  scqaNarrative?: Record<string, unknown>;
  challengerInsight?: Record<string, unknown>;
  frameworkAnalysis?: FrameworkAnalysis;
  quality_report?: {
    score: number;
    feedback: string;
    passed: boolean;
    suggestions: string[];
  };
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

export const useScriptStore = create<ScriptFeedbackState>()(
  (set) => ({
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
  }),
);
