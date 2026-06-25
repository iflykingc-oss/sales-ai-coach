const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// --- Configuration ---
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const TIMEOUT_MS = 90_000; // 90s — AI calls can be slow
const CIRCUIT_BREAKER_THRESHOLD = 5; // consecutive failures before opening
const CIRCUIT_BREAKER_RESET_MS = 60_000; // 1 minute cooldown

// --- Circuit breaker state ---
let consecutiveFailures = 0;
let circuitOpenUntil = 0;

function isCircuitOpen(): boolean {
  if (Date.now() < circuitOpenUntil) return true;
  if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_RESET_MS;
    return true;
  }
  return false;
}

function recordSuccess() {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
}

function recordFailure() {
  consecutiveFailures++;
}

// --- Sleep helper ---
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Core caller with retry + timeout + circuit breaker ---
interface AiServiceRequest {
  path: string;
  method?: string;
  body?: Record<string, unknown>;
}

export async function callAiService<T>({ path, method = 'POST', body }: AiServiceRequest): Promise<T> {
  if (isCircuitOpen()) {
    throw new Error('AI service circuit breaker is open — service temporarily unavailable');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS * attempt); // Exponential-ish backoff
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${AI_SERVICE_URL}/api${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'unknown');
        throw new Error(`AI service error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as { success?: boolean; data?: T };
      recordSuccess();
      return (data.data ?? data) as T;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on client errors (4xx) — those are our fault
      if (lastError.message.includes('AI service error (4')) {
        recordFailure();
        throw lastError;
      }
    }
  }

  recordFailure();
  throw lastError || new Error('AI service call failed after retries');
}

// --- Type definitions ---

export interface ScriptGenerationInput {
  input: string;
  inputType: string;
  industry?: string;
  context?: string;
  userId: string;
  frameworks?: string[];
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
