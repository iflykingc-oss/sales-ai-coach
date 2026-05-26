import { z } from 'zod';

export const scriptSchema = z.object({
  input: z.string().min(1, '输入不能为空'),
  inputType: z.enum(['screenshot', 'text', 'voice']).default('text'),
  industry: z.string().default(''),
  context: z.string().default(''),
});

export const scriptResponseSchema = z.object({
  speech_styles: z.array(
    z.object({
      style: z.string(),
      content: z.string(),
    }),
  ),
  reasoning: z.array(z.string()),
  pitfalls: z.array(
    z.object({
      action: z.string(),
      reason: z.string(),
    }),
  ),
  knowledge_source: z.string(),
  confidence_score: z.number().min(0).max(1),
});

export const practiceSessionSchema = z.object({
  scenario: z.string().min(1, '场景描述不能为空'),
  industry: z.string().default(''),
  mode: z.enum(['scenario', 'freestyle']).default('scenario'),
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

export const taskSchema = z.object({
  title: z.string().min(1, '任务标题不能为空').max(200),
  description: z.string().max(1000).default(''),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

export const pluginSchema = z.object({
  industry: z.string().min(1, '行业不能为空'),
  name: z.string().min(1, '插件名称不能为空'),
  version: z.string().default('1.0.0'),
});
