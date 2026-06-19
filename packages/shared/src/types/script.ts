import type { MessageRole, InputType, ScriptStatus } from './enums';

export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  inputType: InputType;
  createdAt: Date;
}

export interface CreateMessageInput {
  sessionId: string;
  role: MessageRole;
  content: string;
  inputType?: InputType;
}

export interface Script {
  id: string;
  userId: string;
  sessionId: string | null;
  content: string;
  style: string;
  tags: string[];
  industry: string | null;
  status: ScriptStatus;
  weight: number;
  createdAt: Date;
}

export interface ScriptStyle {
  style: string;
  content: string;
}

export interface GenerateScriptInput {
  sessionId?: string;
  input: string;
  inputType: InputType;
  industry?: string;
  context?: string;
}

export interface GenerateScriptOutput {
  // New format fields
  tacticalExecutionPaths?: Array<{
    pathType: string;
    strategicLever: string;
    verbalScript: string;
    coachingDirectives?: { pacingAndTone: string; microBehaviors: string };
  }>;
  detectedBusinessMode?: 'B2B' | 'B2C';
  salesLifecycleStage?: string;
  buyerPersonaAnalysis?: { targetStakeholder: string; hiddenDriver: string };
  multiStageSimulation?: { expectedPushback: string; counterStrategy: string; nextProgressiveMove: string };
  // Legacy format
  speechStyles?: ScriptStyle[];
  // Common fields
  reasoning: string[];
  pitfalls: { action: string; reason: string }[];
  knowledgeSource: string;
  confidenceScore: number;
}

export interface CreateScriptInput {
  sessionId?: string;
  content: string;
  style: string;
  tags?: string[];
  industry?: string;
}

export interface UpdateScriptInput {
  content?: string;
  style?: string;
  tags?: string[];
  status?: ScriptStatus;
  weight?: number;
}
