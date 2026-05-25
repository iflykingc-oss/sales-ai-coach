import type { Plan, TaskStatus } from './enums';

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  plan: Plan;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTeamInput {
  name: string;
}

export interface TeamTask {
  id: string;
  teamId: string;
  assigneeId: string;
  type: string;
  scenario: string;
  deadline: Date;
  status: TaskStatus;
  createdAt: Date;
}

export interface CreateTaskInput {
  assigneeId: string;
  type: string;
  scenario: string;
  deadline: Date;
}

export interface UpdateTaskInput {
  status?: TaskStatus;
  deadline?: Date;
}

export interface TeamDashboard {
  totalMembers: number;
  activeMembers: number;
  scriptStats: {
    totalGenerated: number;
    adoptionRate: number;
    topStyles: string[];
  };
  practiceStats: {
    completedSessions: number;
    averageScore: number;
    scoreDistribution: Record<string, number>;
  };
  weakScenarios: string[];
  memberTrends: {
    userId: string;
    userName: string;
    trend: 'up' | 'down' | 'stable';
  }[];
}
