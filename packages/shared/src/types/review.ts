export interface ReviewReport {
  id: string;
  userId: string;
  sessionId: string | null;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  createdAt: Date;
}

export interface CreateReviewInput {
  conversations: { content: string; role: string }[];
  date?: string;
}

export interface ReviewAnalysis {
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  actionItems: string[];
  radarScores: Record<string, number>;
}
