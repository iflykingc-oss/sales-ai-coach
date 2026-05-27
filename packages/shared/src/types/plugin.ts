export interface PluginScripts {
  templates?: Array<{ name: string; content: string; scenario: string }>;
  [key: string]: unknown;
}

export interface PluginScenarios {
  categories?: string[];
  examples?: Array<{ name: string; description: string }>;
  [key: string]: unknown;
}

export interface PluginKnowledge {
  articles?: Array<{ title: string; content: string; category: string }>;
  [key: string]: unknown;
}

export interface PluginCustomerProfiles {
  segments?: Array<{ name: string; characteristics: string[] }>;
  [key: string]: unknown;
}

export interface PluginBestPractices {
  tips?: Array<{ title: string; description: string; category: string }>;
  [key: string]: unknown;
}

export interface IndustryPlugin {
  id: string;
  name: string;
  industry: string;
  version: string;
  scripts: PluginScripts;
  scenarios: PluginScenarios;
  knowledge: PluginKnowledge;
  customerProfiles: PluginCustomerProfiles;
  bestPractices: PluginBestPractices;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePluginInput {
  name: string;
  industry: string;
  scripts?: PluginScripts;
  scenarios?: PluginScenarios;
  knowledge?: PluginKnowledge;
  customerProfiles?: PluginCustomerProfiles;
  bestPractices?: PluginBestPractices;
}

export interface UpdatePluginInput {
  version?: string;
  scripts?: PluginScripts;
  scenarios?: PluginScenarios;
  knowledge?: PluginKnowledge;
  customerProfiles?: PluginCustomerProfiles;
  bestPractices?: PluginBestPractices;
}

export interface PluginAnalytics {
  installCount: number;
  activeRate: number;
  goodReviewRate: number;
  scriptAdoptionRate: number;
  ranking: number;
}
