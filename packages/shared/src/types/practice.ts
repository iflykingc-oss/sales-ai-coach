export type PracticeDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface PracticeFeedback {
  totalScore?: number;
  strengths?: string[];
  improvements?: string[];
  recommendations?: string[];
  radarScores?: Record<string, number>;
  [key: string]: unknown;
}

export interface ObjectionRecord {
  round: number;
  objection: string;
  handling: string;
  resolved: boolean;
  qualityScore: number;
}

export interface PracticeSession {
  id: string;
  userId: string;
  scenario: string;
  industry: string | null;
  rounds: number;
  score: number;
  difficulty?: PracticeDifficulty;
  buyerArchetype?: string;
  objections?: ObjectionRecord[];
  feedback?: PracticeFeedback;
  createdAt: Date;
}

export interface CreatePracticeInput {
  scenario: string;
  industry?: string;
  mode?: 'scenario' | 'freeform' | 'special';
  difficulty?: PracticeDifficulty;
  maxRounds?: number;
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
  difficulty?: PracticeDifficulty;
  buyerArchetype?: string;
  objectionCount?: number;
}

export interface UserProgress {
  totalXp: number;
  level: number;
  practiceSessions: number;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  unlockedAchievements: string[];
  skillScores: Record<string, number>;
  bestScores: Record<string, number>;
}
