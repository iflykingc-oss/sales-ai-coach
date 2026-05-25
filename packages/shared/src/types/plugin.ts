export interface IndustryPlugin {
  id: string;
  name: string;
  industry: string;
  version: string;
  scripts: Record<string, unknown>;
  scenarios: Record<string, unknown>;
  knowledge: Record<string, unknown>;
  customerProfiles: Record<string, unknown>;
  bestPractices: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePluginInput {
  name: string;
  industry: string;
  scripts?: Record<string, unknown>;
  scenarios?: Record<string, unknown>;
  knowledge?: Record<string, unknown>;
  customerProfiles?: Record<string, unknown>;
  bestPractices?: Record<string, unknown>;
}

export interface UpdatePluginInput {
  version?: string;
  scripts?: Record<string, unknown>;
  scenarios?: Record<string, unknown>;
  knowledge?: Record<string, unknown>;
  customerProfiles?: Record<string, unknown>;
  bestPractices?: Record<string, unknown>;
}

export interface PluginAnalytics {
  installCount: number;
  activeRate: number;
  goodReviewRate: number;
  scriptAdoptionRate: number;
  ranking: number;
}
