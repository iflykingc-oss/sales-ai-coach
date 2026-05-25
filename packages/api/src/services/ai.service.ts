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

  return response.json() as Promise<T>;
}

export interface ScriptGenerationInput {
  input: string;
  inputType: string;
  industry?: string;
  context?: string;
  userId: string;
}

export interface ScriptGenerationOutput {
  speech_styles: Array<{ style: string; content: string }>;
  reasoning: string[];
  pitfalls: Array<{ action: string; reason: string }>;
  knowledge_source: string;
  confidence_score: number;
}

export async function generateScript(input: ScriptGenerationInput): Promise<ScriptGenerationOutput> {
  return callAiService<ScriptGenerationOutput>({
    path: '/scripts/generate',
    body: input,
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
    body: input,
  });
}

export interface ReviewInput {
  conversations: Array<{ content: string; role: string }>;
  userId: string;
}

export interface ReviewOutput {
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  actionItems: string[];
  radarScores: Record<string, number>;
}

export async function analyzeReview(input: ReviewInput): Promise<ReviewOutput> {
  return callAiService<ReviewOutput>({
    path: '/reviews/analyze',
    body: input,
  });
}
