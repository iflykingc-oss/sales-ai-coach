export interface PracticeSession {
  id: string;
  userId: string;
  scenario: string;
  industry: string | null;
  rounds: number;
  score: number;
  feedback: Record<string, unknown>;
  createdAt: Date;
}

export interface CreatePracticeInput {
  scenario: string;
  industry?: string;
  mode?: 'scenario' | 'real' | 'special';
}

export interface PracticeMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  emotion?: string;
  score?: number;
}

export interface PracticeState {
  sessionId: string;
  messages: PracticeMessage[];
  currentRound: number;
  maxRounds: number;
  customerEmotion: string;
  isComplete: boolean;
}

export interface PracticeFeedback {
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  radarScores: Record<string, number>;
}
