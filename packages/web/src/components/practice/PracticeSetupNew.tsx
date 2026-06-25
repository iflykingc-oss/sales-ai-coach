import { useState } from 'react';
import {
  Target, ChevronRight, CheckCircle,
  FileUp, Sparkles, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { DocumentUpload } from './DocumentUpload';

// 专业场景库 - 按销售阶段分类
const SCENARIO_CATEGORIES = [
  {
    id: 'prospecting',
    title: '客户开发',
    icon: '🎯',
    industry: '通用',
    scenarios: [
      {
        id: 'cold-call',
        title: '冷启动电话',
        desc: '首次联系潜在客户，建立初步印象',
        difficulty: 'medium',
        customerProfile: '忙碌的中层管理者，对陌生来电有防备心理',
        greeting: '喂，您好，请问哪位？',
        objectives: ['引起兴趣', '获得进一步沟通机会'],
      },
      {
        id: 'referral-visit',
        title: '转介绍拜访',
        desc: '通过老客户介绍，拜访新客户',
        difficulty: 'easy',
        customerProfile: '对介绍人信任，愿意了解但保持谨慎',
        greeting: '你好，老王跟我提过你，说说你们的情况吧。',
        objectives: ['利用信任背书', '深入了解需求'],
      },
    ],
  },
  {
    id: 'discovery',
    title: '需求挖掘',
    icon: '🔍',
    industry: '通用',
    scenarios: [
      {
        id: 'needs-analysis',
        title: '需求诊断',
        desc: '深入了解客户痛点和真实需求',
        difficulty: 'medium',
        customerProfile: '有明确问题但不确定解决方案的客户',
        greeting: '我们确实有些问题想解决，你先介绍一下吧。',
        objectives: ['挖掘核心痛点', '建立需求共识'],
      },
      {
        id: 'consultative',
        title: '顾问式销售',
        desc: '以专家身份为客户提供建议',
        difficulty: 'hard',
        customerProfile: '理性决策者，需要数据和案例支撑',
        greeting: '你们的方案和别家有什么不同？我需要看到具体的数据。',
        objectives: ['展示专业性', '差异化定位'],
      },
    ],
  },
  {
    id: 'presentation',
    title: '方案展示',
    icon: '📊',
    industry: '通用',
    scenarios: [
      {
        id: 'product-demo',
        title: '产品演示',
        desc: '向客户展示产品功能和价值',
        difficulty: 'medium',
        customerProfile: '有兴趣但担心实施风险的技术负责人',
        greeting: '我对你们的产品挺感兴趣，演示一下吧。',
        objectives: ['展示核心价值', '处理技术疑虑'],
      },
      {
        id: 'solution-proposal',
        title: '方案提报',
        desc: '提交完整的解决方案',
        difficulty: 'hard',
        customerProfile: '多方对比的决策者，关注ROI',
        greeting: '方案我看了，但我还需要对比一下其他家的。',
        objectives: ['突出差异化', '量化价值'],
      },
    ],
  },
  {
    id: 'negotiation',
    title: '商务谈判',
    icon: '💰',
    industry: '通用',
    scenarios: [
      {
        id: 'price-negotiation',
        title: '价格谈判',
        desc: '客户对价格有异议，需要价值塑造',
        difficulty: 'hard',
        customerProfile: '价格敏感型客户，善于比价',
        greeting: '你们的报价太高了，能不能便宜点？',
        objectives: ['价值塑造', '灵活报价策略'],
      },
      {
        id: 'terms-negotiation',
        title: '条款协商',
        desc: '合同条款、付款方式等细节谈判',
        difficulty: 'hard',
        customerProfile: '法务参与，对条款要求严格',
        greeting: '合同条款我们需要再讨论一下，有几个点不能接受。',
        objectives: ['平衡双方利益', '促成签约'],
      },
    ],
  },
  {
    id: 'closing',
    title: '促单成交',
    icon: '🤝',
    industry: '通用',
    scenarios: [
      {
        id: 'urgency-close',
        title: '紧迫感促单',
        desc: '创造紧迫感，推动客户快速决策',
        difficulty: 'hard',
        customerProfile: '犹豫不决，需要临门一脚',
        hesitation: '我再考虑考虑吧。',
        greeting: '方案不错，但我还需要再考虑一下。',
        objectives: ['制造紧迫感', '消除决策障碍'],
      },
      {
        id: 'final-objection',
        title: '最后异议',
        desc: '处理成交前的最后顾虑',
        difficulty: 'expert',
        customerProfile: '即将签约但有最后担忧',
        greeting: '其实我还有一个顾虑...',
        objectives: ['化解最后异议', '锁定成交'],
      },
    ],
  },
  {
    id: 'retention',
    title: '客户维护',
    icon: '📞',
    industry: '通用',
    scenarios: [
      {
        id: 'follow-up',
        title: '跟进回访',
        desc: '维护关系，挖掘新需求',
        difficulty: 'easy',
        customerProfile: '老客户，有合作基础',
        greeting: '你好，上次的事情我们内部讨论了一下。',
        objectives: ['深化关系', '挖掘新机会'],
      },
      {
        id: 'complaint-handling',
        title: '投诉处理',
        desc: '处理客户投诉，挽回客户关系',
        difficulty: 'hard',
        customerProfile: '不满的客户，情绪激动',
        greeting: '你们这个产品太让人失望了！我要投诉！',
        objectives: ['平息情绪', '解决问题', '挽回关系'],
      },
    ],
  },
  // Southeast Asia Scenarios
  {
    id: 'sea-cross-border',
    title: '跨境电商',
    icon: '🌏',
    industry: '跨境电商',
    scenarios: [
      {
        id: 'sea-lazada',
        title: 'Lazada卖家入驻',
        desc: '向中国卖家推荐Lazada平台入驻服务',
        difficulty: 'medium',
        customerProfile: '想拓展东南亚市场的中国电商卖家，担心物流和本地化',
        greeting: '我们确实想做东南亚市场，但对Lazada不太了解，你能介绍一下吗？',
        objectives: ['消除跨境顾虑', '展示平台优势'],
      },
      {
        id: 'sea-tiktok',
        title: 'TikTok Shop推广',
        desc: '向品牌方推广TikTok Shop东南亚直播带货',
        difficulty: 'hard',
        customerProfile: '品牌方市场总监，关注ROI和本地化运营',
        greeting: 'TikTok Shop在东南亚真的有那么大的量吗？我们之前没做过直播。',
        objectives: ['展示东南亚直播电商潜力', '提供运营方案'],
      },
    ],
  },
  {
    id: 'sea-saas',
    title: 'SaaS出海',
    icon: '💻',
    industry: 'SaaS',
    scenarios: [
      {
        id: 'sea-saas-local',
        title: '本地化SaaS销售',
        desc: '向东南亚企业销售SaaS产品，处理本地化和合规问题',
        difficulty: 'hard',
        customerProfile: '新加坡企业IT负责人，关注数据合规和本地支持',
        greeting: '你们的数据中心在哪里？符合新加坡的PDPA合规要求吗？',
        objectives: ['解决合规顾虑', '展示本地化能力'],
      },
      {
        id: 'sea-saas-whatsapp',
        title: 'WhatsApp Business方案',
        desc: '向中小企业推广WhatsApp Business API解决方案',
        difficulty: 'medium',
        customerProfile: '马来西亚中小企业老板，用WhatsApp沟通客户但效率低',
        greeting: '我们现在用WhatsApp个人版跟客户聊，确实很乱，但换系统又怕客户流失。',
        objectives: ['展示自动化优势', '降低迁移顾虑'],
      },
    ],
  },
  {
    id: 'sea-finance',
    title: '金融服务',
    icon: '🏦',
    industry: '金融',
    scenarios: [
      {
        id: 'sea-payment',
        title: '跨境支付方案',
        desc: '向电商卖家推广东南亚本地支付解决方案',
        difficulty: 'medium',
        customerProfile: '跨境电商卖家，担心支付成功率和费率',
        greeting: '现在用的支付方式在东南亚成功率很低，客户经常付不了款。',
        objectives: ['展示本地支付覆盖', '比较费率优势'],
      },
      {
        id: 'sea-insurance',
        title: '保险产品销售',
        desc: '向泰国客户销售健康保险产品',
        difficulty: 'hard',
        customerProfile: '泰国中产阶级，对保险有偏见，觉得是浪费钱',
        greeting: 'ผมไม่ค่อยสนใจประกันนะ คิดว่าเป็นการเสียเงินเปล่าๆ (我不太感兴趣，觉得保险是浪费钱)',
        objectives: ['消除偏见', '建立保障意识'],
      },
    ],
  },
  {
    id: 'sea-retail',
    title: '零售服务',
    icon: '🛒',
    industry: '零售',
    scenarios: [
      {
        id: 'sea-franchise',
        title: '加盟招商',
        desc: '向越南投资者推荐中国餐饮品牌加盟',
        difficulty: 'hard',
        customerProfile: '越南投资者，想做餐饮加盟但担心品牌支持和回本周期',
        greeting: 'Tôi muốn mở quán ăn nhưng sợ rủi ro. Thương hiệu các bạn hỗ trợ gì? (我想开餐厅但怕风险，你们品牌有什么支持？)',
        objectives: ['展示品牌支持体系', '消除投资顾虑'],
      },
      {
        id: 'sea-wholesale',
        title: '批发采购谈判',
        desc: '向马来西亚批发商推销中国产品',
        difficulty: 'medium',
        customerProfile: '马来西亚批发商，价格敏感，关注质量',
        greeting: '你们的产品价格比越南的贵，质量真的有那么好吗？',
        objectives: ['价值塑造', '处理价格异议'],
      },
    ],
  },
];

const DIFFICULTY_CONFIG = {
  easy: { label: '初级', desc: '友善客户，少异议', color: 'bg-green-100 text-green-700 border-green-200', icon: '🟢' },
  medium: { label: '中级', desc: '理性客户，适度异议', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '🟡' },
  hard: { label: '高级', desc: '难缠客户，强烈异议', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🟠' },
  expert: { label: '专家', desc: '组合型客户，多重异议', color: 'bg-red-100 text-red-700 border-red-200', icon: '🔴' },
};

interface PracticeSetupNewProps {
  onStart: (config: {
    scenarioId: string;
    scenarioTitle: string;
    scenarioDesc: string;
    difficulty: string;
    greeting: string;
    customerProfile: string;
    objectives: string[];
    industry?: string;
    mode?: string;
    salesChannel?: string;
    documentContext?: string;
  }) => void;
  isLoading?: boolean;
}

export function PracticeSetupNew({ onStart, isLoading }: PracticeSetupNewProps) {
  const [step, setStep] = useState<'category' | 'scenario' | 'config'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [selectedChannel, setSelectedChannel] = useState('wechat');
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ name: string; content: string }>>([]);
  // Custom scenario state
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customProfile, setCustomProfile] = useState('');
  const [customGreeting, setCustomGreeting] = useState('');

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId === 'custom' || categoryId === 'objection_training') {
      setStep('config');
    } else {
      setStep('scenario');
    }
  };

  const handleScenarioSelect = (scenario: any) => {
    setSelectedScenario(scenario);
    setSelectedDifficulty(scenario.difficulty || 'medium');
    setStep('config');
  };

  const handleStart = () => {
    const categoryData = SCENARIO_CATEGORIES.find(c => c.id === selectedCategory);

    // Objection training mode
    if (selectedCategory === 'objection_training') {
      onStart({
        scenarioId: 'objection_training',
        scenarioTitle: '异议专项训练',
        scenarioDesc: '客户会提出各种异议，你需要先判断异议类型（信任/价值/权力/优先级/恐惧），然后选择合适的应对策略。',
        difficulty: selectedDifficulty,
        greeting: '你们这个产品/服务，我不太确定适不适合我们。',
        customerProfile: '会提出各种类型异议的客户',
        objectives: ['识别异议类型', '运用正确的应对策略'],
        industry: '通用',
        mode: 'objection_training',
        salesChannel: selectedChannel,
      });
      return;
    }

    // Custom scenario
    if (selectedCategory === 'custom') {
      if (!customTitle.trim() || !customDesc.trim()) return;
      onStart({
        scenarioId: 'custom',
        scenarioTitle: customTitle.trim(),
        scenarioDesc: customDesc.trim(),
        difficulty: selectedDifficulty,
        greeting: customGreeting.trim() || '你好，请问有什么可以帮您的？',
        customerProfile: customProfile.trim() || '普通客户',
        objectives: ['完成自定义场景练习'],
        industry: '通用',
        mode: 'scenario',
        salesChannel: selectedChannel,
        documentContext: uploadedDocs.length > 0
          ? uploadedDocs.map(d => d.content.slice(0, 500)).join('\n')
          : undefined,
      });
      return;
    }

    // Pre-built scenario
    if (!selectedScenario) return;

    onStart({
      scenarioId: selectedScenario.id,
      scenarioTitle: String((selectedScenario as Record<string, unknown>)?.title ?? selectedScenario.name),
      scenarioDesc: String((selectedScenario as Record<string, unknown>)?.desc ?? selectedScenario.description ?? ''),
      difficulty: selectedDifficulty,
      greeting: String((selectedScenario as Record<string, unknown>)?.greeting ?? ''),
      customerProfile: String((selectedScenario as Record<string, unknown>)?.customerProfile ?? ''),
      objectives: ((selectedScenario as Record<string, unknown>)?.objectives as string[]) || [],
      industry: categoryData?.industry || '通用',
      mode: 'scenario',
      salesChannel: selectedChannel,
      documentContext: uploadedDocs.length > 0
        ? uploadedDocs.map(d => d.content.slice(0, 500)).join('\n')
        : undefined,
    });
  };

  const canStart = selectedCategory === 'custom'
    ? customTitle.trim().length > 0 && customDesc.trim().length > 0
    : selectedScenario !== null;

  const category = SCENARIO_CATEGORIES.find(c => c.id === selectedCategory);

  return (
    <div className="mx-auto max-w-3xl">
      {/* 进度指示器 */}
      <div className="mb-8 flex items-center justify-center gap-4">
        {[
          { id: 'category', label: '选择类型', icon: Target },
          { id: 'scenario', label: '选择场景', icon: MessageSquare },
          { id: 'config', label: '确认配置', icon: CheckCircle },
        ].map((s, idx) => {
          const Icon = s.icon;
          const isActive = s.id === step;
          const isCompleted =
            (s.id === 'category' && selectedCategory) ||
            (s.id === 'scenario' && selectedScenario);

          return (
            <div key={s.id} className="flex items-center gap-2">
              {idx > 0 && (
                <div className={cn('h-px w-8', isCompleted ? 'bg-primary-500' : 'bg-gray-200')} />
              )}
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                isActive ? 'bg-primary-500 text-white' :
                isCompleted ? 'bg-primary-100 text-primary-700' :
                'bg-gray-100 text-gray-400'
              )}>
                {isCompleted ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={cn(
                'text-sm font-medium',
                isActive ? 'text-primary-700' : isCompleted ? 'text-gray-700' : 'text-gray-400'
              )}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step 1: 选择类型 */}
      {step === 'category' && (
        <div>
          <h2 className="mb-2 text-center text-xl font-bold text-gray-900">选择练习类型</h2>
          <p className="mb-6 text-center text-sm text-gray-500">根据你想提升的能力选择对应的练习类型</p>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {SCENARIO_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className="group rounded-xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-primary-300 hover:shadow-md"
              >
                <span className="text-3xl">{cat.icon}</span>
                <h3 className="mt-3 font-semibold text-gray-900 group-hover:text-primary-700">
                  {cat.title}
                </h3>
                <p className="mt-1 text-xs text-gray-500">{cat.scenarios.length} 个场景</p>
              </button>
            ))}

            {/* Custom scenario option */}
            <button
              onClick={() => handleCategorySelect('custom')}
              className="group rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-5 text-left transition-all hover:border-primary-300 hover:bg-primary-50"
            >
              <span className="text-3xl">✏️</span>
              <h3 className="mt-3 font-semibold text-gray-900 group-hover:text-primary-700">
                自定义场景
              </h3>
              <p className="mt-1 text-xs text-gray-500">描述你自己的练习场景</p>
            </button>

            {/* Objection training option */}
            <button
              onClick={() => handleCategorySelect('objection_training')}
              className="group rounded-xl border-2 border-orange-200 bg-orange-50 p-5 text-left transition-all hover:border-orange-400 hover:shadow-md"
            >
              <span className="text-3xl">🎯</span>
              <h3 className="mt-3 font-semibold text-gray-900 group-hover:text-orange-700">
                异议专项训练
              </h3>
              <p className="mt-1 text-xs text-gray-500">先判断异议类型，再学习应对策略</p>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: 选择场景 */}
      {step === 'scenario' && category && (
        <div>
          <button
            onClick={() => setStep('category')}
            className="mb-4 text-sm text-gray-500 hover:text-gray-700"
          >
            ← 返回选择类型
          </button>

          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {category.icon} {category.title}
          </h2>
          <p className="mb-6 text-sm text-gray-500">选择具体的练习场景</p>

          <div className="space-y-3">
            {category.scenarios.map((scenario) => {
              const diffConfig = DIFFICULTY_CONFIG[scenario.difficulty as keyof typeof DIFFICULTY_CONFIG];
              return (
                <button
                  key={scenario.id}
                  onClick={() => handleScenarioSelect(scenario)}
                  className="group w-full rounded-xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-primary-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-primary-700">
                        {scenario.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">{scenario.desc}</p>
                    </div>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', diffConfig.color)}>
                      {diffConfig.label}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {scenario.objectives?.map((obj, idx) => (
                      <span key={idx} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {obj}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                    <MessageSquare className="h-3 w-3" />
                    <span>开场: "{scenario.greeting}"</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: 配置确认 */}
      {step === 'config' && (
        <div>
          <button
            onClick={() => setStep(selectedCategory === 'custom' ? 'category' : 'scenario')}
            className="mb-4 text-sm text-gray-500 hover:text-gray-700"
          >
            ← 返回
          </button>

          <h2 className="mb-6 text-xl font-bold text-gray-900">
            {selectedCategory === 'custom' ? '自定义练习场景' : '确认练习配置'}
          </h2>

          {/* Custom scenario form */}
          {selectedCategory === 'custom' && (
            <div className="mb-6 space-y-4 rounded-xl border border-gray-200 bg-white p-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">场景名称 *</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="例如：新产品推介、客户回访、竞品对比..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">场景描述 *</label>
                <textarea
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="描述具体的销售场景，例如：客户是一家制造企业的采购总监，对我们的智能制造方案有兴趣..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">客户画像</label>
                <textarea
                  value={customProfile}
                  onChange={(e) => setCustomProfile(e.target.value)}
                  placeholder="描述客户特点，例如：理性决策者，关注ROI，有预算限制..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">客户开场白</label>
                <input
                  type="text"
                  value={customGreeting}
                  onChange={(e) => setCustomGreeting(e.target.value)}
                  placeholder="例如：你好，听说你们有款不错的产品？"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {/* Pre-built scenario info */}
          {selectedCategory !== 'custom' && selectedScenario && (
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="font-semibold text-gray-900">{String((selectedScenario as Record<string, unknown>)?.title ?? selectedScenario.name)}</h3>
              <p className="mt-1 text-sm text-gray-600">{String((selectedScenario as Record<string, unknown>)?.desc ?? selectedScenario.description ?? '')}</p>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">客户画像</p>
                  <p className="mt-1 text-sm text-gray-700">{String((selectedScenario as Record<string, unknown>)?.customerProfile ?? '')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">练习目标</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {((selectedScenario as Record<string, unknown>)?.objectives as string[])?.map((obj, idx) => (
                      <span key={idx} className="rounded bg-primary-50 px-2 py-0.5 text-xs text-primary-700">
                        {obj}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">客户开场白</p>
                <p className="mt-1 text-sm italic text-gray-700">"{String((selectedScenario as Record<string, unknown>)?.greeting ?? '')}"</p>
              </div>
            </div>
          )}

          {/* AI Agent 推理展示 */}
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-800">
              <Sparkles className="h-4 w-4" />
              AI Agent 分析
            </h3>
            <div className="space-y-2 text-sm text-blue-700">
              <p>📋 <strong>任务规划:</strong> 根据场景自动选择客户画像和销售框架</p>
              <p>🎯 <strong>框架推荐:</strong> 基于"{selectedCategory === 'custom' ? customTitle : selectedScenario?.name}"场景，AI将自动匹配最佳销售方法论</p>
              <p>🧠 <strong>动态评估:</strong> 每轮对话后自动评估9个维度，低分时主动提供教练建议</p>
              <p>📊 <strong>实时追踪:</strong> 监控客户情绪变化，检测异议和购买信号</p>
            </div>
          </div>

          {/* 难度选择 */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-gray-700">调整难度</h3>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedDifficulty(key)}
                  className={cn(
                    'rounded-lg border-2 p-3 text-center transition-all',
                    selectedDifficulty === key
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <div>{config.icon}</div>
                  <div className="mt-1 text-xs font-medium">{config.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 销售场景选择 */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-gray-700">销售场景</h3>
            <div className="grid grid-cols-5 gap-2">
              {[
                { key: 'phone', label: '电话销售', icon: '📞' },
                { key: 'wechat', label: '微信销售', icon: '💬' },
                { key: 'inperson', label: '面销', icon: '🤝' },
                { key: 'event', label: '会销', icon: '🎤' },
                { key: 'group', label: '群运营', icon: '👥' },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setSelectedChannel(key)}
                  className={cn(
                    'rounded-lg border-2 p-2 text-center transition-all',
                    selectedChannel === key
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <div>{icon}</div>
                  <div className="mt-1 text-[10px] font-medium">{label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 上传文档 */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <button
              onClick={() => setShowDocUpload(!showDocUpload)}
              className="flex w-full items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <FileUp className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">上传相关资料（可选）</span>
              </div>
              <ChevronRight className={cn('h-4 w-4 text-gray-400 transition-transform', showDocUpload && 'rotate-90')} />
            </button>
            {showDocUpload && (
              <div className="mt-4">
                <p className="mb-3 text-xs text-gray-500">
                  上传产品手册、客户资料等，AI会基于这些信息进行更精准的陪练
                </p>
                <DocumentUpload
                  onDocumentsReady={setUploadedDocs}
                  maxFiles={3}
                  maxSizeMB={5}
                />
              </div>
            )}
          </div>

          {/* 开始按钮 */}
          <Button
            size="lg"
            onClick={handleStart}
            disabled={!canStart || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                AI正在准备客户画像...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                开始陪练
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
