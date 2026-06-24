import type { SpeechStyleType } from './types';

export const SPEECH_GEN_CONFIG = {
  // ========== 生成参数 ==========
  baseTemperature: 0.55,
  temperatureDecay: 0.1,
  minTemperature: 0.25,
  maxTokens: 4096,
  maxRetries: 3,
  passScore: 0.75,

  // ========== 质控阈值 ==========
  styleSimilarityThreshold: 0.68,
  knowledgeOverlapThreshold: 0.25,
  dedupSimilarityThreshold: 0.78,

  // ========== 话术结构要求 ==========
  requiredSections: ['开场白', '异议处理', '价值呈现', '促成'],

  // ========== 禁用词与占位符 ==========
  forbiddenPlaceholders: [
    'XX', '某某', '某公司', '具体说明', '（具体', '相关优势', '等方面', '相关产品'
  ],

  // ========== 风格定义（绑定知识用法） ==========
  styleRules: {
    '共情版': {
      openingRule: '必须用"我理解"、"确实"等共情类词汇开头',
      strategyUsage: '站在客户立场，用知识库中的算账方法、对比逻辑帮客户避坑、做决策参考',
      tone: '温和亲和，像朋友聊天，不说教',
      example: '我完全理解您的想法，给娃报课确实要精打细算...'
    },
    '直爽版': {
      openingRule: '必须用数据、算账公式或直接结论开头',
      strategyUsage: '直接用知识库中的单价对比、成本拆分公式给结论，不绕客套话',
      tone: '干脆利落，效率优先，不拖泥带水',
      example: '咱们直接算笔账，单课时价格其实我们比同行更便宜...'
    },
    '专业版': {
      openingRule: '必须用行业规律、效果保障或市场趋势开头',
      strategyUsage: '用知识库中的零风险策略、行业普遍规律做专业背书，体现顾问身份',
      tone: '理性客观，顾问式沟通，有说服力',
      example: '其实家长选机构最核心看两点：单课时成本和效果保障...'
    }
  } as Record<SpeechStyleType, {
    openingRule: string;
    strategyUsage: string;
    tone: string;
    example: string;
  }>
};
