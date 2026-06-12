import { z } from 'zod';

// Re-export auth schemas
export { registerSchema, loginSchema, updateProfileSchema } from './auth';
export type { RegisterInput, LoginInput, UpdateProfileInput } from './auth';

export const scriptSchema = z.object({
  input: z.string().min(1, '输入不能为空'),
  inputType: z.enum(['TEXT', 'IMAGE', 'VOICE', 'FORM', 'PASTE']).default('TEXT'),
  industry: z.string().default(''),
  context: z.string().default(''),
});

export const scriptResponseSchema = z.object({
  // 新结构 - 战术执行路径
  detectedBusinessMode: z.enum(['B2B', 'B2C']).optional(),
  salesLifecycleStage: z.string().optional(),
  buyerPersonaAnalysis: z.object({
    targetStakeholder: z.string(),
    hiddenDriver: z.string(),
  }).optional(),
  tacticalExecutionPaths: z.array(
    z.object({
      pathType: z.enum(['共情版', '直爽版', '专业版']),
      strategicLever: z.string(),
      verbalScript: z.string(),
      coachingDirectives: z.object({
        pacingAndTone: z.string(),
        microBehaviors: z.string(),
      }).optional(),
    }),
  ).optional(),
  multiStageSimulation: z.object({
    expectedPushback: z.string(),
    counterStrategy: z.string(),
    nextProgressiveMove: z.string(),
  }).optional(),

  // 兼容旧结构
  speechStyles: z.array(
    z.object({
      style: z.string(),
      content: z.string(),
    }),
  ).optional(),

  // 通用字段
  reasoning: z.array(z.string()).default([]),
  pitfalls: z.array(
    z.object({
      action: z.string(),
      reason: z.string(),
    }),
  ).default([]),
  knowledgeSource: z.string().default('AI生成'),
  confidenceScore: z.number().min(0).max(1).default(0.8),
});

export const practiceSessionSchema = z.object({
  scenario: z.string().min(1, '场景描述不能为空'),
  industry: z.string().default(''),
  mode: z.enum(['scenario', 'freeform', 'special']).default('scenario'),
  maxRounds: z.number().min(1).max(20).default(10),
});

export const practiceMessageSchema = z.object({
  sessionId: z.string().min(1, '会话ID不能为空'),
  message: z.string().min(1, '消息不能为空'),
});

export const knowledgeSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  content: z.string().min(1, '内容不能为空').max(10000),
  category: z.string().default(''),
  tags: z.array(z.string()).default([]),
  industry: z.string().default(''),
});

export const knowledgeUpdateSchema = z.object({
  id: z.string().min(1, 'ID不能为空'),
  action: z.enum(['approve', 'reject', 'archive', 'edit']),
  reason: z.string().optional(),
});

export const createKnowledgeUpdateSchema = z.object({
  source: z.string().min(1, '来源不能为空'),
  content: z.string().min(1, '内容不能为空'),
  tags: z.array(z.string()).optional(),
  industry: z.string().optional(),
});

export const reviewSchema = z.object({
  conversations: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'customer', 'sales']),
      content: z.string().min(1),
    }),
  ),
  context: z.object({
    industry: z.string().optional(),
    scenario: z.string().optional(),
  }).optional(),
});

export const teamSchema = z.object({
  name: z.string().min(1, '团队名称不能为空').max(100),
  description: z.string().max(500).default(''),
});

export const createTeamSchema = z.object({
  name: z.string().min(1, '团队名称不能为空'),
});

export const taskSchema = z.object({
  title: z.string().min(1, '任务标题不能为空').max(200),
  description: z.string().max(1000).default(''),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

export const createTaskSchema = z.object({
  assigneeId: z.string().min(1, '负责人不能为空'),
  type: z.string().min(1, '任务类型不能为空'),
  scenario: z.string().min(1, '场景不能为空'),
  deadline: z.string().datetime(),
});

export const pluginSchema = z.object({
  industry: z.string().min(1, '行业不能为空'),
  name: z.string().min(1, '插件名称不能为空'),
  version: z.string().default('1.0.0'),
});

export const createSessionSchema = z.object({
  name: z.string().min(1, '会话名称不能为空'),
  industry: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateSessionSchema = z.object({
  name: z.string().min(1).optional(),
  industry: z.string().optional(),
  status: z.enum(['PENDING', 'NEGOTIATING', 'WON', 'LOST', 'ARCHIVED']).optional(),
  tags: z.array(z.string()).optional(),
});

export const createMessageSchema = z.object({
  sessionId: z.string().min(1, '会话ID不能为空'),
  role: z.enum(['USER', 'ASSISTANT', 'SYSTEM']),
  content: z.string().min(1, '消息内容不能为空'),
  inputType: z.enum(['TEXT', 'IMAGE', 'VOICE', 'FORM', 'PASTE']).optional(),
});
