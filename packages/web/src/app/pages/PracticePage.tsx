import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, History } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PracticeSetupNew } from '@/components/practice/PracticeSetupNew';
import { PracticeChat } from '@/components/practice/PracticeChat';
import { PracticeSummary } from '@/components/practice/PracticeSummaryNew';
import { usePracticeStore, type PracticeMode } from '@/stores/practiceStore';
import { useActivityStore } from '@/stores/activityStore';
import { toast } from '@/hooks/useToast';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

type PracticeView = 'setup' | 'chat' | 'auto-report' | 'summary';

// 预定义场景配置（用于快速开始）
const QUICK_SCENARIOS: Record<string, {
  id: string;
  title: string;
  desc: string;
  difficulty: string;
  greeting: string;
  customerProfile: string;
  objectives: string[];
  industry: string;
}> = {
  'cold-call': {
    id: 'cold-call',
    title: '冷启动电话',
    desc: '首次联系潜在客户，建立初步印象',
    difficulty: 'medium',
    greeting: '喂，您好，请问哪位？',
    customerProfile: '忙碌的中层管理者，对陌生来电有防备心理',
    objectives: ['引起兴趣', '获得进一步沟通机会'],
    industry: '通用',
  },
  'needs-analysis': {
    id: 'needs-analysis',
    title: '需求诊断',
    desc: '深入了解客户痛点和真实需求',
    difficulty: 'medium',
    greeting: '我们确实有些问题想解决，你先介绍一下吧。',
    customerProfile: '有明确问题但不确定解决方案的客户',
    objectives: ['挖掘核心痛点', '建立需求共识'],
    industry: '通用',
  },
  'product-demo': {
    id: 'product-demo',
    title: '产品演示',
    desc: '向客户展示产品功能和价值',
    difficulty: 'medium',
    greeting: '我对你们的产品挺感兴趣，演示一下吧。',
    customerProfile: '有兴趣但担心实施风险的技术负责人',
    objectives: ['展示核心价值', '处理技术疑虑'],
    industry: '通用',
  },
  'price-negotiation': {
    id: 'price-negotiation',
    title: '价格谈判',
    desc: '客户对价格有异议，需要价值塑造',
    difficulty: 'hard',
    greeting: '你们的报价太高了，能不能便宜点？',
    customerProfile: '价格敏感型客户，善于比价',
    objectives: ['价值塑造', '灵活报价策略'],
    industry: '通用',
  },
  'terms-negotiation': {
    id: 'terms-negotiation',
    title: '条款协商',
    desc: '合同条款、付款方式等细节谈判',
    difficulty: 'hard',
    greeting: '合同条款我们需要再讨论一下，有几个点不能接受。',
    customerProfile: '法务参与，对条款要求严格',
    objectives: ['平衡双方利益', '促成签约'],
    industry: '通用',
  },
  'urgency-close': {
    id: 'urgency-close',
    title: '紧迫感促单',
    desc: '创造紧迫感，推动客户快速决策',
    difficulty: 'hard',
    greeting: '方案不错，但我还需要再考虑一下。',
    customerProfile: '犹豫不决，需要临门一脚',
    objectives: ['制造紧迫感', '消除决策障碍'],
    industry: '通用',
  },
  'referral-visit': {
    id: 'referral-visit',
    title: '转介绍拜访',
    desc: '通过老客户介绍，拜访新客户',
    difficulty: 'medium',
    greeting: '你好，老王跟我提过你，说说你们的情况吧。',
    customerProfile: '对介绍人信任，愿意了解但保持谨慎',
    objectives: ['利用信任背书', '深入了解需求'],
    industry: '通用',
  },
  'follow-up': {
    id: 'follow-up',
    title: '跟进回访',
    desc: '维护关系，挖掘新需求',
    difficulty: 'easy',
    greeting: '你好，上次的事情我们内部讨论了一下。',
    customerProfile: '老客户，有合作基础',
    objectives: ['深化关系', '挖掘新机会'],
    industry: '通用',
  },
  'solution-proposal': {
    id: 'solution-proposal',
    title: '方案提报',
    desc: '提交完整的解决方案',
    difficulty: 'hard',
    greeting: '方案我看了，但我还需要对比一下其他家的。',
    customerProfile: '多方对比的决策者，关注ROI',
    objectives: ['突出差异化', '量化价值'],
    industry: '通用',
  },
  'final-objection': {
    id: 'final-objection',
    title: '最后异议',
    desc: '处理成交前的最后顾虑',
    difficulty: 'expert',
    greeting: '其实我还有一个顾虑...',
    customerProfile: '即将签约但有最后担忧',
    objectives: ['化解最后异议', '锁定成交'],
    industry: '通用',
  },
  'complaint-handling': {
    id: 'complaint-handling',
    title: '投诉处理',
    desc: '处理客户投诉，挽回客户关系',
    difficulty: 'hard',
    greeting: '你们这个产品太让人失望了！我要投诉！',
    customerProfile: '不满的客户，情绪激动',
    objectives: ['平息情绪', '解决问题', '挽回关系'],
    industry: '通用',
  },
};

export default function PracticePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<PracticeView>('setup');
  const [isStarting, setIsStarting] = useState(false);
  const { resetPractice, setSession } = usePracticeStore();
  const { addActivity } = useActivityStore();
  const quickStartRef = useRef(false);

  // 快速开始逻辑
  useEffect(() => {
    const scenarioId = searchParams.get('scenario');
    const isQuick = searchParams.get('quick') === 'true';

    if (scenarioId && isQuick && !quickStartRef.current) {
      quickStartRef.current = true;
      const scenarioConfig = QUICK_SCENARIOS[scenarioId];
      if (scenarioConfig) {
        handleStartPractice({
          scenarioId: scenarioConfig.id,
          scenarioTitle: scenarioConfig.title,
          scenarioDesc: scenarioConfig.desc,
          difficulty: scenarioConfig.difficulty,
          greeting: scenarioConfig.greeting,
          customerProfile: scenarioConfig.customerProfile,
          objectives: scenarioConfig.objectives,
          industry: scenarioConfig.industry,
          mode: 'scenario',
        });
      }
    }
  }, [searchParams]);

  const handleStartPractice = async (config: {
    scenarioId: string;
    scenarioTitle: string;
    scenarioDesc: string;
    difficulty: string;
    greeting: string;
    customerProfile: string;
    objectives: string[];
    industry?: string;
    mode?: string;
    documentContext?: string;
  }) => {
    setIsStarting(true);

    try {
      // Build scenario description with context
      const scenarioDesc = `
场景: ${config.scenarioTitle} - ${config.scenarioDesc}
客户画像: ${config.customerProfile}
练习目标: ${config.objectives.join('、')}
${config.documentContext ? `\n参考资料:\n${config.documentContext}` : ''}
      `.trim();

      // Initialize session with the API
      const response = await api.post('/practices/init', {
        scenario: scenarioDesc,
        industry: config.industry || '通用',
        mode: config.mode || 'scenario',
        maxRounds: 10,
        difficulty: config.difficulty,
        knowledgeContext: config.documentContext || '',
      });

      const initData = response.data.data;

      // Use the greeting from config or from API
      const greeting = initData.greeting || config.greeting;

      // Extract framework recommendation from AI
      const frameworkRec = initData.frameworkRecommendation;

      // Build a richer greeting message with AI reasoning
      const messages: Array<{id: string; role: 'assistant'; content: string; timestamp: number}> = [];

      if (greeting) {
        messages.push({
          id: `msg-${Date.now()}`,
          role: 'assistant' as const,
          content: greeting,
          timestamp: Date.now(),
        });
      }

      // Add AI reasoning message if framework recommendation exists
      if (frameworkRec?.recommendedFramework) {
        const fwName = frameworkRec.recommendedFramework.name || frameworkRec.recommendedFramework;
        const reason = frameworkRec.reason || '';
        messages.push({
          id: `fw-${Date.now()}`,
          role: 'assistant' as const,
          content: `🎯 AI分析: 基于你的场景，推荐使用「${fwName}」销售框架${reason ? ` - ${reason}` : ''}`,
          timestamp: Date.now() + 1,
        });
      }

      setSession({
        id: initData.session_id,
        mode: 'scenario' as PracticeMode,
        scenarioId: config.scenarioId,
        scenarioName: config.scenarioTitle,
        difficulty: config.difficulty,
        archetypeName: initData.archetype_name,
        logicFramework: frameworkRec?.recommendedFramework?.id || '',
        messages,
        round: 0,
        maxRounds: 10,
        customerEmotion: 'interest',
        state: 'practicing',
        startedAt: Date.now(),
      });

      setView('chat');
      addActivity({
        type: 'practice_session',
        title: '开始陪练',
        description: config.scenarioTitle,
      });
    } catch (error) {
      console.error('Failed to start practice:', error);
      toast.error('AI服务连接失败', { description: '无法连接AI陪练服务，请稍后重试' });
    } finally {
      setIsStarting(false);
    }
  };

  const [autoReport, setAutoReport] = useState<any>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const handleEndPractice = async () => {
    setView('auto-report');
    setIsLoadingReport(true);

    try {
      const session = usePracticeStore.getState().session;
      const res = await api.post('/practices/report', {
        sessionId: session?.id,
        scenario: session?.scenarioName,
        transcript: session?.messages?.map(m => ({ role: m.role, content: m.content })),
        rounds: session?.round,
      });
      setAutoReport(res.data?.data || res.data);
    } catch (error) {
      console.error('Failed to generate report:', error);
      // 即使报告生成失败，也允许查看完整报告
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleViewFullSummary = () => {
    setView('summary');
  };

  const handleRestart = () => {
    resetPractice();
    setView('setup');
  };

  // 快速开始加载状态
  if (isStarting && view === 'setup') {
    return (
      <div className="mx-auto max-w-4xl">
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900">正在准备练习...</p>
              <p className="text-sm text-gray-500">AI客户正在加载中</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setIsStarting(false); setView('setup'); }}>
              取消
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">AI 陪练</h2>
          <p className="mt-1 text-sm text-gray-500">
            {view === 'setup' && '选择场景，开始与AI客户对话练习'}
            {view === 'chat' && '与AI客户对话中'}
            {view === 'auto-report' && '练习完成'}
            {view === 'summary' && '查看详细报告'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {view !== 'setup' && (
            <Button variant="ghost" size="sm" onClick={handleRestart}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              返回
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/practice/history')}
          >
            <History className="mr-1.5 h-4 w-4" />
            历史记录
          </Button>
        </div>
      </div>

      {/* Content */}
      {view === 'setup' && (
        <Card className="p-6">
          <PracticeSetupNew onStart={handleStartPractice} isLoading={isStarting} />
        </Card>
      )}

      {view === 'chat' && (
        <Card className="overflow-hidden p-0">
          <PracticeChat onEnd={handleEndPractice} />
        </Card>
      )}

      {view === 'auto-report' && (
        <Card className="p-6">
          {isLoadingReport ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900">AI 正在分析你的表现...</p>
                <p className="text-sm text-gray-500">正在从8个维度评估你的销售技巧</p>
              </div>
            </div>
          ) : autoReport ? (
            <div className="space-y-6">
              {/* 总分 */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary-50 border-4 border-primary-200 mb-3">
                  <span className="text-3xl font-bold text-primary-600">
                    {Math.round(((autoReport.overall_score ?? 0.65) as number) * 100)}
                  </span>
                </div>
                <p className="text-lg font-medium text-gray-900">
                  {(autoReport.overall_score ?? 0.65) >= 0.8 ? '优秀！' :
                   (autoReport.overall_score ?? 0.65) >= 0.6 ? '表现良好' : '继续加油'}
                </p>
              </div>

              {/* 优势 */}
              {autoReport.strengths && autoReport.strengths.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-green-700 mb-2">✅ 优势</h3>
                  <div className="space-y-1">
                    {autoReport.strengths.map((s: string, i: number) => (
                      <p key={i} className="text-sm text-gray-700 bg-green-50 rounded-lg px-3 py-2">{s}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* 待改进 */}
              {autoReport.improvements && autoReport.improvements.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-amber-700 mb-2">💡 待改进</h3>
                  <div className="space-y-1">
                    {autoReport.improvements.map((s: string, i: number) => (
                      <p key={i} className="text-sm text-gray-700 bg-amber-50 rounded-lg px-3 py-2">{s}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* 雷达图分数 */}
              {autoReport.radarScores && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">📊 维度评分</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(autoReport.radarScores).map(([key, value]) => {
                      // Normalize score: if 0-1 range, multiply by 100; if already 0-100, use as-is
                      const rawScore = value as number;
                      const displayScore = rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);
                      return (
                        <div key={key} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-sm text-gray-700">{key}</span>
                          <span className={cn(
                            'text-sm font-medium',
                            displayScore >= 70 ? 'text-green-600' :
                            displayScore >= 50 ? 'text-amber-600' : 'text-red-600'
                          )}>
                            {displayScore}分
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3 pt-4">
                <Button variant="secondary" className="flex-1" onClick={handleRestart}>
                  再练一次
                </Button>
                <Button className="flex-1" onClick={handleViewFullSummary}>
                  查看详细报告
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">报告生成失败，但你仍可查看详细报告</p>
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={handleEndPractice}>
                  重新生成
                </Button>
                <Button onClick={handleViewFullSummary}>
                  查看详细报告
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {view === 'summary' && (
        <PracticeSummary onRestart={handleRestart} />
      )}
    </div>
  );
}
