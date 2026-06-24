/** 结构化知识条目 */
export interface KnowledgeItem {
  id: string;
  industry: string;
  scene: string;       // 客户异议类型：太贵了/没时间/怕没效果
  strategy: string;    // 核心销售策略
  example: string;     // 参考话术示例
  rawScore: number;    // 原始检索得分
}

/** 话术风格枚举 */
export type SpeechStyleType = '共情版' | '直爽版' | '专业版';

/** 单条话术 */
export interface SpeechItem {
  pathType: SpeechStyleType;
  verbalScript: string;
}

/** 生成结果主结构（兼容现有接口输出） */
export interface SpeechGenerateResult {
  tacticalExecutionPaths: SpeechItem[];
  confidenceScore: number;
  knowledgeUsed: string[];
  meta?: {
    retryAttempts: number;
    status: 'SUCCESS' | 'DEGRADED';
    knowledgeCount: number;
  };
  error?: string;
}

/** 质量评估结果 */
export interface EvalResult {
  passed: boolean;
  level: 1 | 2 | 3;
  overallScore: number;
  feedback: string;
  suggestions: string[];
}

/** 生成入参 */
export interface GenerateParams {
  userScene: string;        // 用户输入的销售场景
  industry: string;         // 识别出的行业
  objectionType: string;    // 识别出的异议类型
  rawKnowledge: string[];   // 原始检索知识列表
  language?: 'zh' | 'en';
  maxRetries?: number;
}
