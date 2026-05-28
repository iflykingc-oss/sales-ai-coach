import type { Role, Plan } from './enums';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  plan: Plan;
  industry: string[];
  teamId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserPublic = User;

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  plan?: Plan;
  industry?: string[];
}

export interface UpdateUserInput {
  name?: string;
  industry?: string[];
  plan?: Plan;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserPublic;
}
