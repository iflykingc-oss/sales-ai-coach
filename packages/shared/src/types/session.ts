import type { SessionStatus } from './enums';

export interface Session {
  id: string;
  userId: string;
  teamId: string | null;
  name: string;
  industry: string | null;
  status: SessionStatus;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionInput {
  name: string;
  industry?: string;
  tags?: string[];
}

export interface UpdateSessionInput {
  name?: string;
  industry?: string;
  status?: SessionStatus;
  tags?: string[];
}
