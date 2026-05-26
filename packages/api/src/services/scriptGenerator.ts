import { salesLogicFrameworks, type LogicFramework } from '../data/salesLogicFrameworks.js';

interface ScriptContext {
  industry: string;
  customerProfile: string;
  painPoints: string[];
  goals: string[];
  frameworkId?: string;
}

interface GeneratedScript {
  framework: LogicFramework;
  stages: {
    name: string;
    script: string;
    keyQuestions: string[];
    logicPattern: string;
  }[];
  tips: string[];
}

export function generateScript(context: ScriptContext): GeneratedScript {
  // 根据 context 选择合适的逻辑框架
  const framework = selectFramework(context);
  
  // 为每个阶段生成具体话术
  const stages = framework.stages.map(stage => ({
    name: stage.name,
    script: generateStageScript(stage, context),
    keyQuestions: stage.keyQuestions,
    logicPattern: stage.logicPattern
  }));
  
  // 生成使用建议
  const tips = generateTips(framework, context);
  
  return { framework, stages, tips };
}

function selectFramework(context: ScriptContext): LogicFramework {
  if (context.frameworkId) {
    const fw = salesLogicFrameworks.find(f => f.id === context.frameworkId);
    if (fw) return fw;
  }
  
  // 默认使用预期同步法
  return salesLogicFrameworks[0];
}

function generateStageScript(stage: any, context: ScriptContext): string {
  const { name, purpose, keyQuestions } = stage;
  
  // 根据阶段名称和目的生成基础话术模板
  const templates: Record<string, string> = {
    '现状确认': `妈妈，我了解到孩子目前的情况是${context.painPoints.join('、')}。您最担心的是哪方面呢？`,
    '目标对齐': `我们预计用${context.goals[0] || '2-3个月'}的时间，重点改善${context.painPoints[0] || '学习效果'}。您觉得这个目标合适吗？`,
    '路径规划': `我们分三个阶段来达成目标：第一阶段...第二阶段...第三阶段...需要您配合的是...`,
    '标准对标': `以${context.industry}为例，这个阶段的标准是...`,
    '现状评估': `孩子目前处于...水平，与标准相比，差距主要在...`,
    '追赶策略': `我们优先补强...同时发挥...优势，预计...时间能看到明显改善。`,
    '案例呈现': `之前有个类似情况的孩子，通过...方法，用了...时间，最终...`,
    '数据支撑': `我们的学员平均提分幅度是...满意度达到...续费率...`,
    '专属方案': `根据孩子的具体情况，我建议...这个方案的优势是...预计效果是...`
  };
  
  return templates[name] || `${purpose}。${keyQuestions.join(' ')}。`;
}

function generateTips(framework: LogicFramework, context: ScriptContext): string[] {
  return [
    `使用${framework.name}时，注意倾听客户反馈，灵活调整节奏`,
    '每个阶段结束后，确认客户是否理解并接受',
    '用具体案例和数据增强说服力',
    '保持专业但亲切的语气，建立信任关系'
  ];
}

export function getAvailableFrameworks(): LogicFramework[] {
  return salesLogicFrameworks;
}

export function getFrameworkById(id: string): LogicFramework | undefined {
  return salesLogicFrameworks.find(f => f.id === id);
}
