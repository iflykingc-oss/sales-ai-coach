import type { KnowledgeStatus } from './enums';

export interface KnowledgeItem {
  id: string;
  userId: string;
  teamId: string | null;
  source: string;
  content: string;
  tags: string[];
  industry: string | null;
  weight: number;
  status: KnowledgeStatus;
  createdAt: Date;
}

export interface CreateKnowledgeInput {
  source: string;
  content: string;
  tags?: string[];
  industry?: string;
}

export interface UpdateKnowledgeInput {
  content?: string;
  tags?: string[];
  status?: KnowledgeStatus;
  weight?: number;
}

export interface ImportKnowledgeInput {
  file: File;
  industry?: string;
  tags?: string[];
}
