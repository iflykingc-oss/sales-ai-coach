// Shared evaluation dimensions for AI practice radar chart.
// Must match exactly with backend EVALUATION_DIMENSIONS in evaluation_dimensions.py

export const EVALUATION_DIMENSIONS = [
  '需求挖掘',
  '异议处理',
  '促单能力',
  '沟通表达',
  '情绪管理',
  '产品知识',
  '信任建立',
  '价值传递',
] as const;

export type EvaluationDimension = typeof EVALUATION_DIMENSIONS[number];
