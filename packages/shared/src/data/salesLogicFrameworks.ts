// 销售话术逻辑框架库
// 基于算法和心理学原理构建的话术结构

export interface LogicFramework {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  stages: Stage[];
  useCases: string[];
  emotionFlow: string[];
}

export interface Stage {
  id: string;
  name: string;
  purpose: string;
  keyQuestions: string[];
  logicPattern: string;
  exampleScript: string;
}

export const salesLogicFrameworks: LogicFramework[] = [
  {
    id: 'expectation-sync',
    name: '预期同步法',
    nameEn: 'Expectation Sync',
    description: '通过同步客户原始预期，建立共同认知基础，逐步引导目标对齐',
    stages: [
      {
        id: 'status-confirm',
        name: '现状确认',
        purpose: '了解客户当前状态和痛点，建立信任',
        keyQuestions: [
          '孩子目前的学习状态如何？',
          '您最担心的是什么问题？',
          '之前尝试过哪些方法？效果怎样？'
        ],
        logicPattern: 'FACT → PAIN → ATTEMPT → EMPATHY',
        exampleScript: '妈妈，我了解到孩子目前的情况是[痛点]。这个阶段确实容易遇到这样的挑战，您最担心的是哪方面呢？'
      },
      {
        id: 'goal-align',
        name: '目标对齐',
        purpose: '与客户就改善目标达成共识',
        keyQuestions: [
          '您希望多长时间看到改善？',
          '短期重点突破哪个方面？',
          '长期希望达到什么水平？'
        ],
        logicPattern: 'SHORT_TERM → LONG_TERM → CONSENSUS',
        exampleScript: '我们预计用2-3个月的时间，重点改善[具体方面]。短期先[短期目标]，长期达到[长期目标]。您觉得这个规划合适吗？'
      },
      {
        id: 'path-plan',
        name: '路径规划',
        purpose: '制定具体可行的执行方案',
        keyQuestions: [
          '我们分几个阶段来达成目标？',
          '每个阶段的里程碑是什么？',
          '需要您配合做哪些事情？'
        ],
        logicPattern: 'PHASES → MILESTONES → COOPERATION',
        exampleScript: '我们分三个阶段：第一阶段[内容]，第二阶段[内容]，第三阶段[内容]。需要您配合的是[配合事项]。'
      }
    ],
    useCases: ['续费沟通', '课程调整', '目标设定', '家长回访'],
    emotionFlow: ['hesitate', 'interest', 'empathy']
  },
  {
    id: 'gap-analysis',
    name: '差距分析法',
    nameEn: 'Gap Analysis',
    description: '通过对比现状与目标/标准，找出差距并制定追赶计划',
    stages: [
      {
        id: 'benchmark',
        name: '标准对标',
        purpose: '明确行业/考试标准，建立参照系',
        keyQuestions: [
          '这个阶段的正常水平是什么？',
          '考试/升学要求是什么？',
          '优秀学生的标准是什么？'
        ],
        logicPattern: 'BENCHMARK → REQUIREMENT → STANDARD',
        exampleScript: '以[考试/升学]为例，这个阶段的标准是[标准]。比如西城区三年级开学测，听力占40分，笔试占60分。'
      },
      {
        id: 'current-assess',
        name: '现状评估',
        purpose: '客观评估当前水平，找出差距',
        keyQuestions: [
          '孩子现在处于什么水平？',
          '与标准差距在哪里？',
          '哪些是强项，哪些是弱项？'
        ],
        logicPattern: 'CURRENT → GAP → STRENGTHS_WEAKNESSES',
        exampleScript: '孩子目前处于[水平]，与标准相比，差距主要在[差距]。强项是[强项]，需要加强的是[弱项]。'
      },
      {
        id: 'catchup',
        name: '追赶策略',
        purpose: '制定针对性提升方案',
        keyQuestions: [
          '优先补强哪个短板？',
          '如何发挥现有优势？',
          '多长时间能缩小差距？'
        ],
        logicPattern: 'PRIORITY → LEVERAGE → TIMELINE',
        exampleScript: '我们优先补强[短板]，同时发挥[优势]的优势。预计[时间]能缩小差距，达到[目标水平]。'
      }
    ],
    useCases: ['成绩分析', '升学规划', '竞争力评估', '学习诊断'],
    emotionFlow: ['hesitate', 'interest', 'empathy']
  },
  {
    id: 'value-demo',
    name: '价值展示法',
    nameEn: 'Value Demonstration',
    description: '通过具体案例和数据展示服务价值，建立信任',
    stages: [
      {
        id: 'case-show',
        name: '案例呈现',
        purpose: '用相似案例建立信任',
        keyQuestions: [
          '有类似情况的学员后来怎么样？',
          '他们是如何改善的？',
          '用了多长时间？'
        ],
        logicPattern: 'SIMILAR_CASE → IMPROVEMENT → TIMELINE',
        exampleScript: '之前有个类似情况的孩子，也是[痛点]。通过[方法]，用了[时间]，最终[成果]。'
      },
      {
        id: 'data-support',
        name: '数据支撑',
        purpose: '用客观数据证明效果',
        keyQuestions: [
          '平均提分幅度是多少？',
          '学员满意度如何？',
          '续费率/推荐率是多少？'
        ],
        logicPattern: 'AVERAGE_IMPROVEMENT → SATISFACTION → RETENTION',
        exampleScript: '我们的学员平均提分[幅度]，满意度达到[百分比]，续费率[百分比]。这些数据说明...'
      },
      {
        id: 'custom-plan',
        name: '专属方案',
        purpose: '为客户定制个性化方案',
        keyQuestions: [
          '根据孩子情况，我们建议...',
          '这个方案的优势是...',
          '预计效果是...'
        ],
        logicPattern: 'CUSTOMIZATION → ADVANTAGE → EXPECTED_RESULT',
        exampleScript: '根据孩子的具体情况，我建议[方案]。这个方案的优势是[优势]，预计效果是[效果]。'
      }
    ],
    useCases: ['首次咨询', '方案推荐', '异议处理', '竞品对比'],
    emotionFlow: ['resist', 'hesitate', 'interest', 'empathy']
  },
  {
    id: 'pain-amplify',
    name: '痛点放大法',
    nameEn: 'Pain Amplification',
    description: '通过引导客户思考不行动的代价，激发改变动力',
    stages: [
      {
        id: 'pain-identify',
        name: '痛点确认',
        purpose: '确认客户的核心痛点',
        keyQuestions: [
          '这个问题持续多久了？',
          '对孩子有什么影响？',
          '您尝试过哪些方法？'
        ],
        logicPattern: 'DURATION → IMPACT → ATTEMPTS',
        exampleScript: '这个问题持续[时间]了，对孩子[影响]。您之前试过[方法]，效果不理想对吗？'
      },
      {
        id: 'consequence',
        name: '后果推演',
        purpose: '引导思考不改变的后果',
        keyQuestions: [
          '如果继续这样，会怎样？',
          '半年后会是什么状态？',
          '升学/考试会受影响吗？'
        ],
        logicPattern: 'IF_CONTINUE → HALF_YEAR → EXAM_IMPACT',
        exampleScript: '如果继续这样，半年后孩子可能会[后果]。到时候[升学/考试]就会[影响]。'
      },
      {
        id: 'solution',
        name: '方案呈现',
        purpose: '提供解决痛点的方案',
        keyQuestions: [
          '我们能帮您解决的是...',
          '具体怎么做是...',
          '预计效果是...'
        ],
        logicPattern: 'WE_SOLVE → HOW → RESULT',
        exampleScript: '我们能帮您解决[痛点]。具体做法是[方案]，预计[时间]能看到[效果]。'
      }
    ],
    useCases: ['犹豫客户', '拖延客户', '价格敏感', '竞品对比'],
    emotionFlow: ['resist', 'hesitate', 'interest']
  }
];

export function getFrameworkById(id: string): LogicFramework | undefined {
  return salesLogicFrameworks.find(f => f.id === id);
}

export function getFrameworksByUseCase(useCase: string): LogicFramework[] {
  return salesLogicFrameworks.filter(f => f.useCases.includes(useCase));
}

export function getAllFrameworks(): LogicFramework[] {
  return salesLogicFrameworks;
}

export function getStageById(frameworkId: string, stageId: string): Stage | undefined {
  const fw = getFrameworkById(frameworkId);
  return fw?.stages.find(s => s.id === stageId);
}
