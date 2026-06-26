export type Role = 'USER' | 'ADMIN' | 'TEAM_OWNER';
export type Plan = 'FREE' | 'PROFESSIONAL' | 'TEAM' | 'ENTERPRISE';
export type SessionStatus = 'PENDING' | 'NEGOTIATING' | 'WON' | 'LOST' | 'ARCHIVED';
export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';
export type InputType = 'TEXT' | 'IMAGE' | 'VOICE' | 'FORM' | 'PASTE';
export type ScriptStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type KnowledgeStatus = 'ACTIVE' | 'ARCHIVED' | 'REVIEW';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

// Industry enum. Keep in sync with the i18n UI in packages/web.
export const INDUSTRIES = [
  'realestate',
  'automotive',
  'saas',
  'insurance',
  'finance',
  'healthcare',
  'education',
  'retail',
  'manufacturing',
  'consulting',
  'other',
] as const;
export type Industry = typeof INDUSTRIES[number];
