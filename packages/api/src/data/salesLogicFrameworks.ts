// 销售话术逻辑框架库
// 基于算法和心理学原理构建的话术结构

export interface LogicFramework {
  id: string;
  name: string;
  description: string;
  stages: Stage[];
  useCases: string[];
}

export interface Stage {
  name: string;
  purpose: string;
  keyQuestions: string[];
  logicPattern: string;
}

export const salesLogicFrameworks: LogicFramework[] = [
  {
    id: 'expectation-sync',
    name: '预期同步法',
    description: '通过同步客户原始预期，建立共同认知基础',
    stages: [
      {
        name: '现状确认',
        purpose: '了解客户当前状态和痛点',
        keyQuestions: [
          '孩子目前的学习状态如何？',
          '您最担心的是什么问题？',
          '之前尝试过哪些方法？'
        ],
        logicPattern: 'FACT → PAIN → ATTEMPT'
      },
      {
        name: '目标对齐',
        purpose: '与客户就改善目标达成共识',
        keyQuestions: [
          '您希望多长时间看到改善？',
          '短期重点突破哪个方面？',
          '长期希望达到什么水平？'
        ],
        logicPattern: 'SHORT_TERM → LONG_TERM → CONSENSUS'
      },
      {
        name: '路径规划',
        purpose: '制定具体可行的执行方案',
        keyQuestions: [
          '我们分几个阶段来达成目标？',
          '每个阶段的里程碑是什么？',
          '需要您配合做哪些事情？'
        ],
        logicPattern: 'PHASES → MILESTONES → COOPERATION'
      }
    ],
    useCases: ['续费沟通', '课程调整', '目标设定']
  },
  {
    id: 'gap-analysis',
    name: '差距分析法',
    description: '通过对比现状与目标，找出差距并制定追赶计划',
    stages: [
      {
        name: '标准对标',
        purpose: '明确行业/考试标准',
        keyQuestions: [
          '这个阶段的正常水平是什么？',
          '考试/升学要求是什么？',
          '优秀学生的标准是什么？'
        ],
        logicPattern: 'BENCHMARK → REQUIREMENT → STANDARD'
      },
      {
        name: '现状评估',
        purpose: '客观评估当前水平',
        keyQuestions: [
          '孩子现在处于什么水平？',
          '与标准差距在哪里？',
          '哪些是强项，哪些是弱项？'
        ],
        logicPattern: 'CURRENT → GAP → STRENGTHS_WEAKNESSES'
      },
      {
        name: '追赶策略',
        purpose: '制定针对性提升方案',
        keyQuestions: [
          '优先补强哪个短板？',
          '如何发挥现有优势？',
          '多长时间能缩小差距？'
        ],
        logicPattern: 'PRIORITY → LEVERAGE → TIMELINE'
      }
    ],
    useCases: ['成绩分析', '升学规划', '竞争力评估']
  },
  {
    id: 'value-demonstration',
    name: '价值展示法',
    description: '通过具体案例和数据展示服务价值',
    stages: [
      {
        name: '案例呈现',
        purpose: '用相似案例建立信任',
        keyQuestions: [
          '有类似情况的学员后来怎么样？',
          '他们是如何改善的？',
          '用了多长时间？'
        ],
        logicPattern: 'SIMILAR_CASE → IMPROVEMENT → TIMELINE'
      },
      {
        name: '数据支撑',
        purpose: '用客观数据证明效果',
        keyQuestions: [
          '平均提分幅度是多少？',
          '学员满意度如何？',
          '续费率/推荐率是多少？'
        ],
        logicPattern: 'AVERAGE_IMPROVEMENT → SATISFACTION → RETENTION'
      },
      {
        name: '专属方案',
        purpose: '为客户定制个性化方案',
        keyQuestions: [
          '根据孩子情况，我们建议...',
          '这个方案的优势是...',
          '预计效果是...'
        ],
        logicPattern: 'CUSTOMIZATION → ADVANTAGE → EXPECTED_RESULT'
      }
    ],
    useCases: ['首次咨询', '方案推荐', '异议处理']
  }
];

export function getFrameworkById(id: string): LogicFramework | undefined {
  return salesLogicFrameworks.find(f => f.id === id);
}

export function getFrameworksByUseCase(useCase: string): LogicFramework[] {
  return salesLogicFrameworks.filter(f => f.useCases.includes(useCase));
}

export function generateScriptPattern(framework: LogicFramework, stageIndex: number): string {
  const stage = framework.stages[stageIndex];
  if (!stage) return '';
  
  return stage.logicPattern.split(' → ').join('，然后');
}
