export interface PracticeScenario {
  id: string;
  name: string;
  industry: string;
  description: string;
}

export const practiceScenarios: PracticeScenario[] = [
  // Real Estate
  { id: 're-1', name: '首次看房接待', industry: '房地产', description: '客户第一次来看房，需要建立信任' },
  { id: 're-2', name: '价格谈判', industry: '房地产', description: '客户对价格有异议，需要谈判技巧' },
  { id: 're-3', name: '处理客户犹豫', industry: '房地产', description: '客户犹豫不决，需要推动决策' },
  // Auto
  { id: 'au-1', name: '新车介绍', industry: '汽车', description: '客户想了解新车，需要专业介绍' },
  { id: 'au-2', name: '竞品对比', industry: '汽车', description: '客户在对比竞品，需要差异化分析' },
  { id: 'au-3', name: '试驾后促单', industry: '汽车', description: '试驾后需要促成订单' },
  // SaaS
  { id: 'sa-1', name: '需求挖掘', industry: 'SaaS', description: '需要了解客户真实需求' },
  { id: 'sa-2', name: '方案演示', industry: 'SaaS', description: '需要演示产品方案价值' },
  { id: 'sa-3', name: '处理预算异议', industry: 'SaaS', description: '客户预算不足，需要灵活应对' },
  // Insurance
  { id: 'in-1', name: '保险需求分析', industry: '保险', description: '需要分析客户保险需求' },
  { id: 'in-2', name: '方案推荐', industry: '保险', description: '需要推荐合适的保险方案' },
  { id: 'in-3', name: '处理理赔担忧', industry: '保险', description: '客户担心理赔，需要建立信心' },
];

export const industries = ['房地产', '汽车', 'SaaS', '保险'] as const;

export function getScenariosByIndustry(industry: string): PracticeScenario[] {
  return practiceScenarios.filter((s) => s.industry === industry);
}
