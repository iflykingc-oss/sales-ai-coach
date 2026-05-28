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
  },
  {
    id: 'spin-selling',
    name: 'SPIN销售法',
    nameEn: 'SPIN Selling',
    description: '基于尼尔·雷克汉姆的SPIN销售法，通过情境(Situation)、问题(Problem)、暗示(Implication)、需求-效益(Need-Payoff)四类提问引导客户发现需求',
    stages: [
      {
        id: 'situation',
        name: '情境问题',
        purpose: '了解客户现状、业务背景、决策流程',
        keyQuestions: ['您目前使用什么方案?', '团队规模多大?', '这个流程持续多久了?'],
        logicPattern: '通过开放式问题建立对客户业务的全面了解',
        exampleScript: '王总，想了解一下您目前团队在XX方面是怎么做的？大概投入了多少人力和资源？'
      },
      {
        id: 'problem',
        name: '问题问题',
        purpose: '引导客户表达痛点和不满',
        keyQuestions: ['这个方案有什么不足?', '遇到过什么困难?', '哪些方面没有达到预期?'],
        logicPattern: '让客户自己说出问题，比我们指出问题更有说服力',
        exampleScript: '在使用现有方案的过程中，有没有遇到什么让您觉得不太满意的地方？'
      },
      {
        id: 'implication',
        name: '暗示问题',
        purpose: '放大问题的影响，让客户意识到紧迫性',
        keyQuestions: ['这个问题导致了什么后果?', '如果不解决会怎样?', '对其他业务有什么影响?'],
        logicPattern: '将小问题放大为大问题，将局部问题放大为全局问题',
        exampleScript: '如果这个问题持续下去，对您的业绩目标会有什么影响？团队的士气会受到什么影响？'
      },
      {
        id: 'need-payoff',
        name: '需求-效益问题',
        purpose: '让客户自己说出解决方案的价值',
        keyQuestions: ['如果能解决这个问题，对您意味着什么?', '您希望达到什么效果?', '这能为您带来什么价值?'],
        logicPattern: '让客户自己说出价值，比我们推销更有力量',
        exampleScript: '如果我们能帮您解决这个问题，对您的团队和业务会有什么积极的影响？'
      }
    ],
    useCases: ['B2B销售', '解决方案销售', '大客户开发', '需求调研', '顾问式销售'],
    emotionFlow: ['neutral', 'concerned', 'excited']
  },

  // ========== 分析型框架 (Analytical Frameworks) ==========

  {
    id: 'swot-analysis',
    name: 'SWOT竞争分析',
    nameEn: 'SWOT Analysis',
    description: '通过优势(Strengths)、劣势(Weaknesses)、机会(Opportunities)、威胁(Threats)四维分析，制定精准销售策略',
    stages: [
      {
        id: 'strengths-assess',
        name: '优势挖掘',
        purpose: '识别产品/方案的核心竞争优势，作为话术主打点',
        keyQuestions: ['我们相比竞品最大的差异化优势是什么?', '客户最认可我们的哪些方面?', '我们的成功案例有哪些?'],
        logicPattern: '优势 → 案例佐证 → 客户价值映射',
        exampleScript: '我们在[领域]有[X年]经验，已服务[Y家]类似企业，帮客户实现了[Z%]的提升。'
      },
      {
        id: 'weaknesses-identify',
        name: '劣势预判',
        purpose: '提前识别可能被竞品攻击的弱点，准备防御话术',
        keyQuestions: ['客户可能在哪里犹豫?', '竞品会攻击我们哪些方面?', '我们的短板如何转化为特点?'],
        logicPattern: '承认不足 → 转化视角 → 价值重定义',
        exampleScript: '坦率说我们在[X]方面还在追赶，但正因如此我们在[Y]上投入了更多，确保核心功能做到极致。'
      },
      {
        id: 'opportunities-map',
        name: '机会捕捉',
        purpose: '识别客户未被满足的需求和市场机会，创造切入点',
        keyQuestions: ['客户的行业趋势是什么?', '他们面临哪些新挑战?', '我们的方案能打开哪些新可能?'],
        logicPattern: '趋势洞察 → 痛点关联 → 方案匹配',
        exampleScript: '最近[行业趋势]对您的业务应该有影响，我们的方案正好可以帮您[应对方式]。'
      },
      {
        id: 'threats-evaluate',
        name: '威胁应对',
        purpose: '评估竞品威胁和客户流失风险，制定防守策略',
        keyQuestions: ['客户在看哪些竞品?', '竞品的主打卖点是什么?', '如何在对比中突出差异化?'],
        logicPattern: '了解竞品 → 差异化定位 → 价值锚定',
        exampleScript: '您提到的[X竞品]确实不错，不过在[关键差异点]上，我们的方案能给您带来[具体价值]。'
      }
    ],
    useCases: ['竞品对比', '方案推荐', '大客户开发', '投标竞争', '市场拓展'],
    emotionFlow: ['analytical', 'strategic', 'confident']
  },

  {
    id: '5w2h-analysis',
    name: '5W2H场景拆解',
    nameEn: '5W2H Analysis',
    description: '通过Who/What/When/Where/Why/How/How Much七维度系统拆解销售场景，确保话术全面覆盖',
    stages: [
      {
        id: 'who-analysis',
        name: '对象分析(Who)',
        purpose: '明确决策人、影响人、使用人，针对性沟通',
        keyQuestions: ['谁是最终决策人?', '谁会影响这个决定?', '谁是我们的支持者?'],
        logicPattern: '识别角色 → 分析诉求 → 分层沟通',
        exampleScript: '王总，除了您之外，这个项目还需要哪些领导参与决策？我会准备针对性的材料。'
      },
      {
        id: 'what-analysis',
        name: '需求定义(What)',
        purpose: '精准定义客户核心需求和期望成果',
        keyQuestions: ['客户最想解决什么问题?', '期望达到什么效果?', '必须满足哪些硬性要求?'],
        logicPattern: '表面需求 → 深层动机 → 量化目标',
        exampleScript: '您提到需要[功能]，我想深入了解——您最希望它帮您解决的核心问题是什么？'
      },
      {
        id: 'when-analysis',
        name: '时机判断(When)',
        purpose: '把握客户决策节奏和紧迫性',
        keyQuestions: ['客户计划什么时候上线?', '有什么时间节点约束?', '预算什么时候到位?'],
        logicPattern: '时间线确认 → 紧迫性创造 → 节奏把控',
        exampleScript: '了解，Q3上线的话我们需要在[时间]前完成部署。我可以帮您倒推一个实施计划。'
      },
      {
        id: 'where-analysis',
        name: '场景定位(Where)',
        purpose: '明确使用场景和部署环境',
        keyQuestions: ['在什么场景下使用?', '需要覆盖哪些区域?', '当前系统环境是什么?'],
        logicPattern: '场景还原 → 痛点场景化 → 方案适配',
        exampleScript: '您提到团队分布在[X个城市]，我们的方案支持多地协同，我来演示一下具体怎么运作。'
      },
      {
        id: 'why-analysis',
        name: '动机深挖(Why)',
        purpose: '理解客户购买的深层动机和驱动力',
        keyQuestions: ['为什么现在要解决这个问题?', '不解决会怎样?', '这对您个人意味着什么?'],
        logicPattern: '业务动机 → 个人动机 → 情感共鸣',
        exampleScript: '王总，我理解这不仅是业务需要，也是您今年的一个重要目标。我们一定全力配合。'
      },
      {
        id: 'how-analysis',
        name: '方案设计(How)',
        purpose: '展示具体实施路径和方法论',
        keyQuestions: ['我们怎么落地?', '分几个阶段?', '每一步怎么保证效果?'],
        logicPattern: '路径规划 → 阶段划分 → 风险预控',
        exampleScript: '我建议分三步走：第一阶段[快速见效]，第二阶段[深度优化]，第三阶段[持续迭代]。'
      },
      {
        id: 'howmuch-analysis',
        name: '价值量化(How Much)',
        purpose: '用数字说话，量化ROI和价值',
        keyQuestions: ['投入产出比是多少?', '能节省多少成本?', '多久能回本?'],
        logicPattern: '投入成本 → 产出价值 → ROI计算',
        exampleScript: '按您目前的规模，预计能帮您节省[X%]的人力成本，[Y个月]即可回本。'
      }
    ],
    useCases: ['需求调研', '方案推荐', '大客户开发', '顾问式销售', '投标竞争'],
    emotionFlow: ['analytical', 'comprehensive', 'data-driven']
  },

  {
    id: 'objection-handling',
    name: '异议四步化解法',
    nameEn: 'LAER Objection Handling',
    description: '通过倾听(Listen)-认同(Acknowledge)-探索(Explore)-回应(Respond)四步法系统处理客户异议',
    stages: [
      {
        id: 'listen',
        name: '倾听异议',
        purpose: '完整听完客户顾虑，不打断、不辩解',
        keyQuestions: ['您说的这个点很重要，能详细说说吗?', '还有其他顾虑吗?'],
        logicPattern: '保持沉默 → 记录要点 → 确认理解',
        exampleScript: '王总，您说的我完全理解。您能再具体说说是哪方面的顾虑吗？'
      },
      {
        id: 'acknowledge',
        name: '认同感受',
        purpose: '让客户感到被理解，降低防御心理',
        keyQuestions: ['您有这个顾虑很正常', '很多客户一开始也有同样的想法'],
        logicPattern: '情绪认同 → 经验共鸣 → 降低防御',
        exampleScript: '您这个顾虑非常合理，说实话很多和您类似情况的客户一开始也有同样的想法。'
      },
      {
        id: 'explore',
        name: '深层探索',
        purpose: '找到异议背后的真实原因',
        keyQuestions: ['如果这个问题解决了，您会怎么考虑?', '主要是预算问题还是效果不确定?'],
        logicPattern: '假设提问 → 根因定位 → 条件试探',
        exampleScript: '我想确认一下——如果我们在[方面]能给您一个更有说服力的数据，您会怎么看？'
      },
      {
        id: 'respond',
        name: '精准回应',
        purpose: '用证据和方案化解真实顾虑',
        keyQuestions: ['这是我们的解决方案', '看看这个案例是否能打消您的顾虑'],
        logicPattern: '证据呈现 → 案例佐证 → 方案承诺',
        exampleScript: '完全理解。给您看一个类似案例——[客户名]之前也有同样顾虑，后来[具体结果]。我们可以先做一个[试点方案]。'
      }
    ],
    useCases: ['异议处理', '价格谈判', '竞品对比', '犹豫客户', '续约沟通'],
    emotionFlow: ['empathetic', 'understanding', 'solution-oriented']
  },

  {
    id: 'closing-techniques',
    name: '成交五步推进法',
    nameEn: '5-Step Closing Technique',
    description: '通过试探→确认→假设→紧迫→收尾五步推进成交，每步有明确的心理学原理支撑',
    stages: [
      {
        id: 'trial-close',
        name: '试探性收尾',
        purpose: '用非承诺性问题测试客户购买意愿',
        keyQuestions: ['如果方案合适，您这边大概什么时候能定?', '除了价格还有其他需要确认的吗?'],
        logicPattern: '假设成交 → 测试反应 → 识别障碍',
        exampleScript: '王总，如果方案和预算都没问题的话，您看我们是不是可以先安排一个试用？'
      },
      {
        id: 'confirmation',
        name: '需求确认',
        purpose: '让客户亲口确认需求和价值',
        keyQuestions: ['您刚才说的[X]确实是您最需要的对吗?', '这个方案能满足您的核心需求吗?'],
        logicPattern: '复述需求 → 客户确认 → 价值锚定',
        exampleScript: '刚才聊下来，您最核心的需求是[需求A]和[需求B]，我们的方案正好覆盖这两点，对吧？'
      },
      {
        id: 'assumptive-close',
        name: '假设成交',
        purpose: '跳过"是否购买"直接讨论"如何实施"',
        keyQuestions: ['您看我们是先从哪个部门开始?', '实施时间您倾向这月还是下月?'],
        logicPattern: '跳过决策 → 进入实施 → 选择题替代判断题',
        exampleScript: '好的，那我们先确定一下——您希望从[部门A]还是[部门B]开始试点？'
      },
      {
        id: 'urgency',
        name: '紧迫感塑造',
        purpose: '创造合理的决策紧迫感',
        keyQuestions: ['这个优惠截止到什么时候?', '如果现在不定会有什么影响?'],
        logicPattern: '限时/限量/限条件 → 机会成本 → 理性紧迫',
        exampleScript: '坦率说，这个价格是本季度的特别政策，下个月会恢复原价。如果各方面都合适的话，建议我们尽快推进。'
      },
      {
        id: 'final-close',
        name: '最终收尾',
        purpose: '明确下一步行动，锁定成交',
        keyQuestions: ['那我们就这么定了?', '下一步需要我准备什么?'],
        logicPattern: '总结价值 → 明确行动 → 具体时间',
        exampleScript: '太好了，那我们这样安排：我今天发合同给您确认，明天安排技术对接，您看这个节奏可以吗？'
      }
    ],
    useCases: ['促成成交', '犹豫客户', '大客户开发', '续费沟通', '方案推荐'],
    emotionFlow: ['confident', 'progressive', 'decisive']
  },

  // ========== 更多分析型框架 (Extended Analytical Frameworks) ==========

  {
    id: 'aida-model',
    name: 'AIDA营销漏斗',
    nameEn: 'AIDA Model',
    description: '通过注意(Attention)-兴趣(Interest)-欲望(Desire)-行动(Action)四阶段引导客户从认知到成交',
    stages: [
      {
        id: 'attention',
        name: '抓注意力',
        purpose: '在开场30秒内抓住客户注意力，建立沟通意愿',
        keyQuestions: ['客户最关心什么结果?', '什么数据/案例最能震撼?', '如何一句话引发好奇?'],
        logicPattern: '数据冲击 → 场景共鸣 → 好奇钩子',
        exampleScript: '王总，上个月和您同行业的[公司名]，用我们的方案3个月内业绩提升了[X%]。我想花2分钟和您聊聊他们是怎么做到的。'
      },
      {
        id: 'interest',
        name: '激发兴趣',
        purpose: '通过痛点共鸣和价值展示维持客户兴趣',
        keyQuestions: ['客户面临什么具体挑战?', '我们的方案如何独特解决?', '有哪些成功故事?'],
        logicPattern: '痛点共鸣 → 方案预览 → 案例佐证',
        exampleScript: '您提到的[痛点]，其实很多同行都面临同样的问题。我们的方案通过[差异化方法]，已经帮[X家]企业解决了这个难题。'
      },
      {
        id: 'desire',
        name: '激发欲望',
        purpose: '让客户从"不错"到"我想要"，建立强烈的购买意愿',
        keyQuestions: ['使用后会是什么状态?', '不行动会错过什么?', '同行都在怎么做?'],
        logicPattern: '场景描绘 → 损失厌恶 → 社会认同',
        exampleScript: '想象一下，如果[问题]解决了，您的团队每天能省出[X小时]。而且目前[行业]里已经有[Y%]的企业在用类似方案了。'
      },
      {
        id: 'action',
        name: '推动行动',
        purpose: '将意愿转化为具体行动，锁定下一步',
        keyQuestions: ['最小的下一步是什么?', '如何降低行动门槛?', '什么时间最合适?'],
        logicPattern: '降低门槛 → 限时激励 → 明确行动',
        exampleScript: '不如我们先安排一个[X]的试用/演示？本周五之前签约的话，还能享受[优惠]。我现在就帮您安排？'
      }
    ],
    useCases: ['首次触达', '冷启动销售', '产品推荐', '活动邀约', '品牌推广'],
    emotionFlow: ['neutral', 'interest', 'desire', 'decisive']
  },

  {
    id: 'fab-principle',
    name: 'FAB利益展示法',
    nameEn: 'FAB (Feature-Advantage-Benefit)',
    description: '将产品特征(Feature)转化为优势(Advantage)再映射到客户利益(Benefit)，让价值传递更有说服力',
    stages: [
      {
        id: 'feature-identify',
        name: '特征识别',
        purpose: '明确产品/方案的核心功能特征',
        keyQuestions: ['我们的核心功能是什么?', '技术/服务上有什么独特之处?', '哪些特征是竞品没有的?'],
        logicPattern: '功能清单 → 差异化特征 → 核心卖点筛选',
        exampleScript: '我们的方案有一个核心功能——[功能名]，它能够[技术描述]。'
      },
      {
        id: 'advantage-translate',
        name: '优势转化',
        purpose: '将功能特征翻译为客户能理解的竞争优势',
        keyQuestions: ['这个功能比竞品好在哪里?', '能带来什么效率/效果提升?', '解决了什么行业痛点?'],
        logicPattern: '特征 → 对比竞品 → 量化优势',
        exampleScript: '这个功能意味着您在[场景]上，比传统方案快[X倍]，准确率高[Y%]。'
      },
      {
        id: 'benefit-map',
        name: '利益映射',
        purpose: '将优势映射到客户的具体业务价值和个人利益',
        keyQuestions: ['对客户业务意味着什么?', '能帮客户个人达成什么KPI?', '投入产出比如何?'],
        logicPattern: '业务价值 → 个人价值 → ROI量化',
        exampleScript: '对您来说，这意味着每月能节省[金额/时间]，帮您在[个人KPI]上提前达标。按您目前的规模，[时间]就能回本。'
      }
    ],
    useCases: ['产品演示', '方案推荐', '竞品对比', '首次咨询', '价值传递'],
    emotionFlow: ['analytical', 'confident', 'excited']
  },

  {
    id: 'bant-qualification',
    name: 'BANT线索判定',
    nameEn: 'BANT Qualification',
    description: '通过预算(Budget)-决策权(Authority)-需求(Need)-时间线(Timeline)四维判定线索质量，聚焦高价值商机',
    stages: [
      {
        id: 'budget-assess',
        name: '预算评估',
        purpose: '了解客户的预算范围和投入意愿',
        keyQuestions: ['这个项目的预算大概在什么范围?', '预算审批流程是怎样的?', '有没有历史投入参考?'],
        logicPattern: '范围确认 → 审批流程 → 投入意愿',
        exampleScript: '王总，为了给您推荐最合适的方案，想了解一下这个项目大致的预算范围？这样我能确保方案的性价比最优。'
      },
      {
        id: 'authority-identify',
        name: '决策链确认',
        purpose: '明确决策人、影响人和审批流程',
        keyQuestions: ['最终决策人是谁?', '还需要哪些人参与?', '审批流程有几个环节?'],
        logicPattern: '决策人 → 影响人 → 审批链',
        exampleScript: '除了您之外，这个方案还需要哪些领导参与评估？我可以准备针对性的材料给不同角色。'
      },
      {
        id: 'need-confirm',
        name: '需求确认',
        purpose: '确认客户的刚性需求和优先级',
        keyQuestions: ['最核心要解决的问题是什么?', '有没有替代方案?', '不解决会有什么后果?'],
        logicPattern: '核心痛点 → 替代方案排除 → 紧迫性确认',
        exampleScript: '您提到[痛点]是最紧迫的。如果继续用现有方式，预计半年后会[后果]。我们的方案可以从根本上解决这个问题。'
      },
      {
        id: 'timeline-clarify',
        name: '时间线明确',
        purpose: '明确客户的决策和实施时间表',
        keyQuestions: ['计划什么时候启动?', '有什么时间节点压力?', '理想的上线时间是?'],
        logicPattern: '时间节点 → 倒推计划 → 承诺交付',
        exampleScript: '了解，您希望[时间]上线。那我们倒推一下——[时间]前签约，[时间]完成部署，刚好赶上您的节点。'
      }
    ],
    useCases: ['线索筛选', '商机评估', '大客户开发', 'B2B销售', '销售预测'],
    emotionFlow: ['analytical', 'strategic', 'decisive']
  },

  {
    id: 'meddic-enterprise',
    name: 'MEDDIC大客户销售',
    nameEn: 'MEDDIC',
    description: '通过指标(Metrics)-经济买家(Economic Buyer)-决策标准(Decision Criteria)-决策流程(Decision Process)-痛点(Identify Pain)-拥护者(Champion)六步推进大客户成交',
    stages: [
      {
        id: 'metrics-quantify',
        name: '价值量化',
        purpose: '用客户认可的指标量化方案价值',
        keyQuestions: ['客户最关注哪些业务指标?', '如何量化改善效果?', '投资回报周期多长?'],
        logicPattern: '业务指标 → 改善预期 → ROI模型',
        exampleScript: '按您目前的[指标]，我们的方案预计能在[时间]内帮您提升[X%]，相当于[金额/效率]的改善。'
      },
      {
        id: 'economic-buyer',
        name: '经济买家定位',
        purpose: '找到最终拍板的人（有钱/有权的人）',
        keyQuestions: ['谁有最终预算审批权?', '这个人最关心什么?', '如何获得他的信任?'],
        logicPattern: '定位决策人 → 理解诉求 → 定制沟通',
        exampleScript: '王总，最终这个项目的预算审批需要经过[领导]对吧？我想了解他最关注的方面，好准备更有针对性的方案。'
      },
      {
        id: 'decision-criteria',
        name: '决策标准',
        purpose: '了解客户选择供应商的评估标准',
        keyQuestions: ['评估供应商的核心标准是什么?', '各项标准的权重如何?', '我们的匹配度如何?'],
        logicPattern: '标准摸底 → 权重分析 → 优势匹配',
        exampleScript: '您在选择供应商时，最看重哪几个方面？是[标准A]、[标准B]还是[标准C]？我想针对性地展示我们的优势。'
      },
      {
        id: 'decision-process',
        name: '决策流程',
        purpose: '掌握从评估到签约的完整流程',
        keyQuestions: ['评估流程分几步?', '需要经过哪些环节?', '通常周期多长?'],
        logicPattern: '流程梳理 → 节点规划 → 推进节奏',
        exampleScript: '了解了评估流程，我来帮您倒推一个时间表：[时间]完成POC，[时间]走完审批，[时间]正式签约启动。'
      },
      {
        id: 'identify-pain',
        name: '痛点深挖',
        purpose: '找到客户的业务痛点和个人痛点',
        keyQuestions: ['业务上最头疼的问题是什么?', '这个问题对您个人有什么影响?', '尝试过什么解决方案?'],
        logicPattern: '业务痛点 → 个人痛点 → 方案匹配',
        exampleScript: '我理解[业务痛点]对您的团队压力很大。作为负责人，您肯定也希望尽快找到靠谱的解决方案。我们可以先从[切入点]开始验证。'
      },
      {
        id: 'champion-develop',
        name: '内部拥护者',
        purpose: '培养客户内部的支持者，让他帮你推动项目',
        keyQuestions: ['谁是内部最支持这个项目的人?', '他有什么个人诉求?', '如何帮他获得内部认可?'],
        logicPattern: '识别支持者 → 利益绑定 → 赋能推动',
        exampleScript: '张经理，我看到您对这个项目特别有想法。我们准备了一套完整的ROI分析材料，帮您在内部汇报时更有说服力。'
      }
    ],
    useCases: ['大客户开发', '企业级销售', '复杂采购', '招投标', '战略客户'],
    emotionFlow: ['analytical', 'strategic', 'relationship', 'decisive']
  },

  {
    id: 'porter-forces',
    name: '波特五力竞争分析',
    nameEn: "Porter's Five Forces",
    description: '从供应商议价力、买方议价力、新进入者威胁、替代品威胁、行业竞争五个维度分析竞争格局，制定差异化销售策略',
    stages: [
      {
        id: 'supplier-power',
        name: '供应商议价力分析',
        purpose: '分析上游供应链对客户的影响，找到服务切入点',
        keyQuestions: ['客户的供应商集中度如何?', '供应链有什么风险?', '我们如何帮客户降低依赖?'],
        logicPattern: '供应链分析 → 风险识别 → 方案价值',
        exampleScript: '您提到上游供应商[情况]，这确实是个风险点。我们的方案可以帮您[降低依赖/分散风险]。'
      },
      {
        id: 'buyer-power',
        name: '买方议价力分析',
        purpose: '分析客户客户的客户画像，理解其业务压力',
        keyQuestions: ['客户的客户是谁?', '客户的客户有什么议价能力?', '这对客户有什么业务压力?'],
        logicPattern: '客户画像 → 压力传导 → 需求挖掘',
        exampleScript: '了解，您的下游客户[画像]，他们的议价能力确实强。这意味着您需要[降本增效/差异化]来保持利润。'
      },
      {
        id: 'new-entrants',
        name: '新进入者威胁',
        purpose: '帮助客户建立竞争壁垒，我们的方案成为壁垒的一部分',
        keyQuestions: ['行业新进入者多吗?', '他们有什么优势?', '客户如何建立壁垒?'],
        logicPattern: '威胁评估 → 壁垒构建 → 方案赋能',
        exampleScript: '最近确实有不少新玩家进入[行业]。我们的方案可以帮您建立[技术/数据/流程]壁垒，拉开差距。'
      },
      {
        id: 'substitutes',
        name: '替代品威胁',
        purpose: '识别替代方案的威胁，突出我们方案的不可替代性',
        keyQuestions: ['客户有没有替代方案?', '替代方案的优劣势是什么?', '我们的不可替代性在哪?'],
        logicPattern: '替代品分析 → 差异化定位 → 不可替代性',
        exampleScript: '您提到也在看[替代方案]，它在[方面]确实不错。但在[关键差异点]上，我们的方案能做到[独特价值]，这是替代方案无法提供的。'
      },
      {
        id: 'industry-rivalry',
        name: '行业竞争格局',
        purpose: '分析行业竞争态势，帮客户找到突围方向',
        keyQuestions: ['行业竞争格局如何?', '客户的竞争对手在做什么?', '我们如何帮客户胜出?'],
        logicPattern: '竞争格局 → 对标分析 → 制胜策略',
        exampleScript: '目前[行业]竞争很激烈，您的主要对手[公司]已经在[方面]发力了。我们的方案可以帮您在[差异化点]上快速追赶甚至超越。'
      }
    ],
    useCases: ['战略客户', '行业分析', '竞品对比', '大客户开发', '解决方案销售'],
    emotionFlow: ['analytical', 'strategic', 'insightful']
  },

  {
    id: 'customer-journey',
    name: '客户旅程地图',
    nameEn: 'Customer Journey Map',
    description: '沿着客户从认知→兴趣→评估→决策→留存的完整旅程，设计每个触点的最优话术',
    stages: [
      {
        id: 'awareness',
        name: '认知阶段',
        purpose: '客户刚开始了解问题存在，需要教育和启发',
        keyQuestions: ['客户知道自己有问题吗?', '他们怎么发现这个问题的?', '行业趋势是什么?'],
        logicPattern: '问题唤醒 → 行业洞察 → 建立权威',
        exampleScript: '最近很多[行业]的客户都在关注[趋势]。您可能也注意到了，[问题描述]正在成为行业痛点。'
      },
      {
        id: 'consideration',
        name: '考虑阶段',
        purpose: '客户在比较方案，需要差异化展示',
        keyQuestions: ['客户在看哪些方案?', '评估标准是什么?', '我们的差异化在哪?'],
        logicPattern: '需求确认 → 差异化展示 → 案例佐证',
        exampleScript: '您在对比方案的时候，建议重点关注[维度]。我们的方案在[差异化点]上有独特优势，看看这个案例...'
      },
      {
        id: 'evaluation',
        name: '评估阶段',
        purpose: '客户深入评估，需要提供试用/POC/案例支撑',
        keyQuestions: ['客户需要什么验证?', '试用/POC怎么设计?', '成功案例如何展示?'],
        logicPattern: '验证方案设计 → 案例展示 → 风险消除',
        exampleScript: '为了让您更放心，我建议先做一个[POC/试用]。[客户名]之前也是这样验证的，[结果]让他们最终决定合作。'
      },
      {
        id: 'decision',
        name: '决策阶段',
        purpose: '客户准备决策，需要临门一脚',
        keyQuestions: ['还有哪些障碍?', '审批流程走到哪了?', '何时签约最合适?'],
        logicPattern: '障碍清除 → 紧迫感 → 促成行动',
        exampleScript: '王总，所有技术验证都通过了，合同条款也对齐了。这个季度签约还有[优惠]，建议我们本周敲定。'
      },
      {
        id: 'retention',
        name: '留存阶段',
        purpose: '成交后的价值交付和续约铺垫',
        keyQuestions: ['使用效果如何?', '还有什么新需求?', '续约/扩展怎么谈?'],
        logicPattern: '效果回顾 → 需求挖掘 → 续约/扩展',
        exampleScript: '王总，上线[X个月]了，[指标]提升了[Y%]。接下来我们可以聊聊[扩展/升级]方案，帮您进一步提升。'
      }
    ],
    useCases: ['全链路销售', '客户管理', '续费沟通', '销售培训', '流程优化'],
    emotionFlow: ['educational', 'consultative', 'supportive', 'decisive', 'relationship']
  },

  {
    id: 'scqa-narrative',
    name: 'SCQA故事框架',
    nameEn: 'SCQA (Situation-Complication-Question-Answer)',
    description: '通过情境(Situation)-冲突(Complication)-问题(Question)-答案(Answer)构建有说服力的销售叙事',
    stages: [
      {
        id: 'situation',
        name: '情境铺设',
        purpose: '用客户熟悉的情境建立共鸣和信任',
        keyQuestions: ['客户的行业现状是什么?', '他们目前在做什么?', '有哪些共识?'],
        logicPattern: '行业共识 → 现状描述 → 建立共鸣',
        exampleScript: '王总，据我了解，目前[行业]的大多数企业都在[现状]。您这边应该也是类似的情况对吧？'
      },
      {
        id: 'complication',
        name: '冲突揭示',
        purpose: '揭示情境中的矛盾和挑战，制造认知落差',
        keyQuestions: ['这个现状有什么问题?', '什么在变化?', '传统方式为什么不行了?'],
        logicPattern: '变化因素 → 挑战揭示 → 认知冲击',
        exampleScript: '但最近[变化因素]出现后，传统方式开始面临[挑战]。很多企业发现[旧方法]已经无法应对[新问题]了。'
      },
      {
        id: 'question',
        name: '问题提出',
        purpose: '将冲突转化为客户必须回答的关键问题',
        keyQuestions: ['面对这个变化该怎么办?', '有没有更好的解决方案?', '如何抓住机会/规避风险?'],
        logicPattern: '冲突 → 核心问题 → 求解动机',
        exampleScript: '那问题来了——面对[挑战]，有没有一种方法能[理想结果]？'
      },
      {
        id: 'answer',
        name: '答案呈现',
        purpose: '我们的方案作为问题的最佳答案',
        keyQuestions: ['我们的方案如何解决这个问题?', '有什么独特优势?', '效果如何?'],
        logicPattern: '方案呈现 → 优势证明 → 效果佐证',
        exampleScript: '这正是我们[产品/方案]要解决的。通过[方法]，我们帮[客户]实现了[效果]。对您的情况，我建议[具体方案]。'
      }
    ],
    useCases: ['首次咨询', '方案推荐', '高层汇报', '品牌故事', '竞品对比'],
    emotionFlow: ['empathetic', 'concerned', 'curious', 'confident']
  },

  {
    id: 'challenger-sale',
    name: '挑战者销售法',
    nameEn: 'Challenger Sale',
    description: '通过教育(Educate)-定制(Tailor)-掌控(Take Control)三步法，用独到见解挑战客户认知，建立专业权威',
    stages: [
      {
        id: 'teach',
        name: '教育客户',
        purpose: '提供客户不知道的行业洞察，建立专业权威',
        keyQuestions: ['客户不知道什么行业趋势?', '有什么数据颠覆他们的认知?', '我们能教他们什么新视角?'],
        logicPattern: '独到见解 → 数据支撑 → 认知重塑',
        exampleScript: '王总，我分享一个我们服务[X家]企业后发现的规律——[洞察]。这个数据可能会颠覆您对[领域]的看法。'
      },
      {
        id: 'tailor',
        name: '定制沟通',
        purpose: '根据客户角色和关注点定制信息',
        keyQuestions: ['这个人最关心什么?', '他的KPI是什么?', '如何让他觉得这是为他量身定做的?'],
        logicPattern: '角色画像 → KPI关联 → 信息定制',
        exampleScript: '张总，我知道您最关心的是[他的KPI]。刚才说的[洞察]，对您这个岗位来说意味着[具体影响]。'
      },
      {
        id: 'take-control',
        name: '掌控节奏',
        purpose: '主动推动销售进程，不被客户牵着走',
        keyQuestions: ['下一步是什么?', '如何不被"再考虑考虑"拖延?', '如何推进到决策?'],
        logicPattern: '价值确认 → 主动推进 → 锁定行动',
        exampleScript: '基于刚才的讨论，我建议下一步是[具体行动]。这个窗口期是[时间]，因为[原因]。您看我们定在[时间]推进？'
      }
    ],
    useCases: ['B2B销售', '高端客户', '顾问式销售', '竞品对比', '方案推荐'],
    emotionFlow: ['insightful', 'personalized', 'decisive']
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

export function generateScriptPattern(framework: LogicFramework, stageIndex: number): string {
  const stage = framework.stages[stageIndex];
  if (!stage) return '';

  return stage.logicPattern.split(' → ').join('，然后');
}

// Framework category helpers
const CONVERSATIONAL_IDS = [
  'expectation-sync', 'gap-analysis', 'value-demo', 'pain-amplify', 'spin-selling',
];
const ANALYTICAL_IDS = [
  'swot-analysis', '5w2h-analysis', 'objection-handling', 'closing-techniques',
  'aida-model', 'fab-principle', 'bant-qualification', 'meddic-enterprise',
  'porter-forces', 'customer-journey', 'scqa-narrative', 'challenger-sale',
];

export function getConversationalFrameworks(): LogicFramework[] {
  return salesLogicFrameworks.filter(f => CONVERSATIONAL_IDS.includes(f.id));
}

export function getAnalyticalFrameworks(): LogicFramework[] {
  return salesLogicFrameworks.filter(f => ANALYTICAL_IDS.includes(f.id));
}

export function getFrameworkCategory(id: string): 'conversational' | 'analytical' | 'unknown' {
  if (CONVERSATIONAL_IDS.includes(id)) return 'conversational';
  if (ANALYTICAL_IDS.includes(id)) return 'analytical';
  return 'unknown';
}
