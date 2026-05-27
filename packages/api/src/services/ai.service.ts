const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

interface AiServiceRequest {
  path: string;
  method?: string;
  body?: Record<string, unknown>;
}

export async function callAiService<T>({ path, method = 'POST', body }: AiServiceRequest): Promise<T> {
  const response = await fetch(`${AI_SERVICE_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI service error (${response.status}): ${error}`);
  }

  const data = (await response.json()) as { success?: boolean; data?: T };
  // AI service wraps all responses in { success, data }
  return (data.data ?? data) as T;
}

export interface ScriptGenerationInput {
  input: string;
  inputType: string;
  industry?: string;
  context?: string;
  userId: string;
}

export interface ScriptGenerationOutput {
  speechStyles: Array<{ style: string; content: string }>;
  reasoning: string[];
  pitfalls: Array<{ action: string; reason: string }>;
  knowledgeSource: string;
  confidenceScore: number;
  quality_report?: {
    score: number;
    feedback: string;
    passed: boolean;
    suggestions: string[];
  };
  execution_report?: {
    task_id: string;
    elapsed_seconds: number;
    retries: number;
  };
}

export async function generateScript(input: ScriptGenerationInput): Promise<ScriptGenerationOutput> {
  return callAiService<ScriptGenerationOutput>({
    path: '/scripts/generate',
    body: input as unknown as Record<string, unknown>,
  });
}

export interface PracticeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PracticeInput {
  scenario: string;
  industry?: string;
  mode: string;
  messages: PracticeMessage[];
  userId: string;
}

export interface PracticeOutput {
  response: string;
  emotion: string;
  score?: number;
  isComplete: boolean;
  feedback?: Record<string, unknown>;
}

export async function sendPracticeMessage(input: PracticeInput): Promise<PracticeOutput> {
  return callAiService<PracticeOutput>({
    path: '/practices/message',
    body: input as unknown as Record<string, unknown>,
  });
}

export interface ReviewInput {
  conversations: Array<{ content: string; role: string }>;
  userId: string;
  history?: string;
  knowledgeContext?: string;
}

export interface ReviewOutput {
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  actionItems: string[];
  radarScores: Record<string, number>;
  quality?: {
    score: number;
    feedback: string;
  };
}

export async function analyzeReview(input: ReviewInput): Promise<ReviewOutput> {
  return callAiService<ReviewOutput>({
    path: '/reviews/analyze',
    body: input as unknown as Record<string, unknown>,
  });
}
