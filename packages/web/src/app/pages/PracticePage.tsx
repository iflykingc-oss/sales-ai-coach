import { logger } from '@/utils/logger';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
const getQuickScenarios = (t: (key: string, opts?: Record<string, unknown>) => unknown): Record<string, {
  id: string;
  title: string;
  desc: string;
  difficulty: string;
  greeting: string;
  customerProfile: string;
  objectives: string[];
  industry: string;
}> => ({
  'cold-call': {
    id: 'cold-call',
    title: t('practicePage.scenarios.coldCall.title') as string,
    desc: t('practicePage.scenarios.coldCall.desc') as string,
    difficulty: 'medium',
    greeting: t('practicePage.scenarios.coldCall.greeting') as string,
    customerProfile: t('practicePage.scenarios.coldCall.profile') as string,
    objectives: t('practicePage.scenarios.coldCall.objectives', { returnObjects: true }) as string[],
    industry: t('practicePage.general') as string,
  },
  'needs-analysis': {
    id: 'needs-analysis',
    title: t('practicePage.scenarios.needsAnalysis.title') as string,
    desc: t('practicePage.scenarios.needsAnalysis.desc') as string,
    difficulty: 'medium',
    greeting: t('practicePage.scenarios.needsAnalysis.greeting') as string,
    customerProfile: t('practicePage.scenarios.needsAnalysis.profile') as string,
    objectives: t('practicePage.scenarios.needsAnalysis.objectives', { returnObjects: true }) as string[],
    industry: t('practicePage.general') as string,
  },
  'product-demo': {
    id: 'product-demo',
    title: t('practicePage.scenarios.productDemo.title') as string,
    desc: t('practicePage.scenarios.productDemo.desc') as string,
    difficulty: 'medium',
    greeting: t('practicePage.scenarios.productDemo.greeting') as string,
    customerProfile: t('practicePage.scenarios.productDemo.profile') as string,
    objectives: t('practicePage.scenarios.productDemo.objectives', { returnObjects: true }) as string[],
    industry: t('practicePage.general') as string,
  },
  'price-negotiation': {
    id: 'price-negotiation',
    title: t('practicePage.scenarios.priceNegotiation.title') as string,
    desc: t('practicePage.scenarios.priceNegotiation.desc') as string,
    difficulty: 'hard',
    greeting: t('practicePage.scenarios.priceNegotiation.greeting') as string,
    customerProfile: t('practicePage.scenarios.priceNegotiation.profile') as string,
    objectives: t('practicePage.scenarios.priceNegotiation.objectives', { returnObjects: true }) as string[],
    industry: t('practicePage.general') as string,
  },
  'terms-negotiation': {
    id: 'terms-negotiation',
    title: t('practicePage.scenarios.termsNegotiation.title') as string,
    desc: t('practicePage.scenarios.termsNegotiation.desc') as string,
    difficulty: 'hard',
    greeting: t('practicePage.scenarios.termsNegotiation.greeting') as string,
    customerProfile: t('practicePage.scenarios.termsNegotiation.profile') as string,
    objectives: t('practicePage.scenarios.termsNegotiation.objectives', { returnObjects: true }) as string[],
    industry: t('practicePage.general') as string,
  },
  'urgency-close': {
    id: 'urgency-close',
    title: t('practicePage.scenarios.urgencyClose.title') as string,
    desc: t('practicePage.scenarios.urgencyClose.desc') as string,
    difficulty: 'hard',
    greeting: t('practicePage.scenarios.urgencyClose.greeting') as string,
    customerProfile: t('practicePage.scenarios.urgencyClose.profile') as string,
    objectives: t('practicePage.scenarios.urgencyClose.objectives', { returnObjects: true }) as string[],
    industry: t('practicePage.general') as string,
  },
  'referral-visit': {
    id: 'referral-visit',
    title: t('practicePage.scenarios.referralVisit.title') as string,
    desc: t('practicePage.scenarios.referralVisit.desc') as string,
    difficulty: 'medium',
    greeting: t('practicePage.scenarios.referralVisit.greeting') as string,
    customerProfile: t('practicePage.scenarios.referralVisit.profile') as string,
    objectives: t('practicePage.scenarios.referralVisit.objectives', { returnObjects: true }) as string[],
    industry: t('practicePage.general') as string,
  },
  'follow-up': {
    id: 'follow-up',
    title: t('practicePage.scenarios.followUp.title') as string,
    desc: t('practicePage.scenarios.followUp.desc') as string,
    difficulty: 'easy',
    greeting: t('practicePage.scenarios.followUp.greeting') as string,
    customerProfile: t('practicePage.scenarios.followUp.profile') as string,
    objectives: t('practicePage.scenarios.followUp.objectives', { returnObjects: true }) as string[],
    industry: t('practicePage.general') as string,
  },
  'solution-proposal': {
    id: 'solution-proposal',
    title: t('practicePage.scenarios.solutionProposal.title') as string,
    desc: t('practicePage.scenarios.solutionProposal.desc') as string,
    difficulty: 'hard',
    greeting: t('practicePage.scenarios.solutionProposal.greeting') as string,
    customerProfile: t('practicePage.scenarios.solutionProposal.profile') as string,
    objectives: t('practicePage.scenarios.solutionProposal.objectives', { returnObjects: true }) as string[],
    industry: t('practicePage.general') as string,
  },
  'final-objection': {
    id: 'final-objection',
    title: t('practicePage.scenarios.finalObjection.title') as string,
    desc: t('practicePage.scenarios.finalObjection.desc') as string,
    difficulty: 'expert',
    greeting: t('practicePage.scenarios.finalObjection.greeting') as string,
    customerProfile: t('practicePage.scenarios.finalObjection.profile') as string,
    objectives: t('practicePage.scenarios.finalObjection.objectives', { returnObjects: true }) as string[],
    industry: t('practicePage.general') as string,
  },
  'complaint-handling': {
    id: 'complaint-handling',
    title: t('practicePage.scenarios.complaintHandling.title') as string,
    desc: t('practicePage.scenarios.complaintHandling.desc') as string,
    difficulty: 'hard',
    greeting: t('practicePage.scenarios.complaintHandling.greeting') as string,
    customerProfile: t('practicePage.scenarios.complaintHandling.profile') as string,
    objectives: t('practicePage.scenarios.complaintHandling.objectives', { returnObjects: true }) as string[],
    industry: t('practicePage.general') as string,
  },
  // Southeast Asia scenarios
  'sea-lazada': {
    id: 'sea-lazada',
    title: t('practicePage.scenarios.seaLazada.title') as string,
    desc: t('practicePage.scenarios.seaLazada.desc') as string,
    difficulty: 'medium',
    greeting: t('practicePage.scenarios.seaLazada.greeting') as string,
    customerProfile: t('practicePage.scenarios.seaLazada.profile') as string,
    objectives: t('practicePage.scenarios.seaLazada.objectives', { returnObjects: true }) as string[],
    industry: '跨境电商',
  },
  'sea-saas-local': {
    id: 'sea-saas-local',
    title: t('practicePage.scenarios.seaSaasLocal.title') as string,
    desc: t('practicePage.scenarios.seaSaasLocal.desc') as string,
    difficulty: 'hard',
    greeting: t('practicePage.scenarios.seaSaasLocal.greeting') as string,
    customerProfile: t('practicePage.scenarios.seaSaasLocal.profile') as string,
    objectives: t('practicePage.scenarios.seaSaasLocal.objectives', { returnObjects: true }) as string[],
    industry: 'SaaS',
  },
  'sea-payment': {
    id: 'sea-payment',
    title: t('practicePage.scenarios.seaPayment.title') as string,
    desc: t('practicePage.scenarios.seaPayment.desc') as string,
    difficulty: 'medium',
    greeting: t('practicePage.scenarios.seaPayment.greeting') as string,
    customerProfile: t('practicePage.scenarios.seaPayment.profile') as string,
    objectives: t('practicePage.scenarios.seaPayment.objectives', { returnObjects: true }) as string[],
    industry: '金融',
  },
});

export default function PracticePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation() as { state?: { fromScript?: boolean; scenario?: string; scriptContent?: string; industry?: string; style?: string; coachingDirectives?: { pacingAndTone?: string; microBehaviors?: string } } };
  const [view, setView] = useState<PracticeView>('setup');
  const [isStarting, setIsStarting] = useState(false);
  const { resetPractice, setSession } = usePracticeStore();
  const { addActivity } = useActivityStore();
  const quickStartRef = useRef(false);
  const fromScriptRef = useRef(false);

  // 快速开始逻辑
  useEffect(() => {
    const scenarioId = searchParams.get('scenario');
    const isQuick = searchParams.get('quick') === 'true';

    if (scenarioId && isQuick && !quickStartRef.current) {
      quickStartRef.current = true;
      const scenarioConfig = getQuickScenarios(t)[scenarioId];
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

  // 从话术生成跳转过来，自动创建自定义场景
  useEffect(() => {
    if (location.state?.fromScript && !fromScriptRef.current) {
      fromScriptRef.current = true;
      const { scenario, scriptContent, industry, style, coachingDirectives } = location.state;

      // Build a richer description that includes coaching directives
      let desc = scriptContent ? `${t('practicePage.scriptBased')}。\n\n${t('practicePage.refScript')}\n${scriptContent.slice(0, 500)}` : t('practicePage.scriptBased');
      if (coachingDirectives) {
        desc += `\n\n${t('practicePage.coachingDirectives')}`;
        if (coachingDirectives.pacingAndTone) desc += `\n${t('practicePage.pacingTone')}${coachingDirectives.pacingAndTone}`;
        if (coachingDirectives.microBehaviors) desc += `\n${t('practicePage.microBehavior')}${coachingDirectives.microBehaviors}`;
      }

      handleStartPractice({
        scenarioId: 'from-script',
        scenarioTitle: `${t('practicePage.scriptPractice')}: ${(scenario || t('practicePage.salesScenario')).slice(0, 30)}`,
        scenarioDesc: desc,
        difficulty: 'medium',
        greeting: t('practicePage.defaultGreeting'),
        customerProfile: scenario || t('practicePage.salesScenario'),
        objectives: [t('practicePage.useScript')],
        industry: industry || t('practicePage.general'),
        mode: 'scenario',
        scriptStyle: style,
        coachingDirectives,
      });
    }
  }, [location.state]);

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
    scriptStyle?: string;
    coachingDirectives?: { pacingAndTone?: string; microBehaviors?: string };
  }) => {
    setIsStarting(true);

    try {
      // Build scenario description with context
      const parts = [
        `${t('practicePage.scenarioLabel')}: ${config.scenarioTitle} - ${config.scenarioDesc}`,
        `${t('practicePage.profileLabel')}: ${config.customerProfile}`,
        `${t('practicePage.objectivesLabel')}: ${config.objectives.join(t('practicePage.objSeparator') as string)}`,
      ];
      if (config.documentContext) {
        parts.push(`${t('practicePage.refLabel')}:\n${config.documentContext}`);
      }
      const scenarioDesc = parts.join('\n');

      // Initialize session with the API
      const response = await api.post('/practices/init', {
        scenario: scenarioDesc,
        industry: config.industry || t('practicePage.general'),
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
          content: `${t('practicePage.aiAnalysis')}: ${t('practicePage.recommendFramework', { name: fwName })}${reason ? ` - ${reason}` : ''}`,
          timestamp: Date.now() + 1,
        });
      }

      setSession({
        id: initData.session_id,
        mode: (config.mode || 'scenario') as PracticeMode,
        scenarioId: config.scenarioId,
        scenarioName: config.scenarioTitle,
        industry: config.industry,
        difficulty: config.difficulty,
        archetypeName: initData.archetype_name,
        logicFramework: frameworkRec?.recommendedFramework?.id || '',
        scriptStyle: config.scriptStyle,
        coachingDirectives: config.coachingDirectives,
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
        title: t('practicePage.startActivity'),
        description: config.scenarioTitle,
      });
    } catch (error) {
      logger.error('Failed to start practice:', error);
      toast.error(t('practicePage.aiServiceFailed'), { description: t('practicePage.aiServiceFailedDesc') });
    } finally {
      setIsStarting(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      logger.error('Failed to generate report:', error);
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
              <p className="text-lg font-medium text-gray-900">{t('practicePage.preparing')}</p>
              <p className="text-sm text-gray-500">{t('practicePage.aiLoading')}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setIsStarting(false); setView('setup'); }}>
              {t('cancel')}
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
          <h2 className="text-xl font-semibold text-gray-900">{t('practicePage.title')}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {view === 'setup' && t('practicePage.setupDesc')}
            {view === 'chat' && t('practicePage.chatDesc')}
            {view === 'auto-report' && t('practicePage.reportDesc')}
            {view === 'summary' && t('practicePage.summaryDesc')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {view !== 'setup' && (
            <Button variant="ghost" size="sm" onClick={handleRestart}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {t('back')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/practice/history')}
          >
            <History className="mr-1.5 h-4 w-4" />
            {t('practicePage.history')}
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
                <p className="text-lg font-medium text-gray-900">{t('practicePage.analyzing')}</p>
                <p className="text-sm text-gray-500">{t('practicePage.analyzingDesc')}</p>
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
                  {(autoReport.overall_score ?? 0.65) >= 0.8 ? t('practicePage.excellent') :
                   (autoReport.overall_score ?? 0.65) >= 0.6 ? t('practicePage.good') : t('practicePage.keepGoing')}
                </p>
              </div>

              {/* 优势 */}
              {autoReport.strengths && autoReport.strengths.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-green-700 mb-2">{t('practicePage.strengths')}</h3>
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
                  <h3 className="text-sm font-medium text-amber-700 mb-2">{t('practicePage.improvements')}</h3>
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
                  <h3 className="text-sm font-medium text-gray-700 mb-2">{t('practicePage.dimensionScores')}</h3>
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
                            {displayScore}{t('score')}
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
                  {t('practicePage.practiceAgain')}
                </Button>
                <Button className="flex-1" onClick={handleViewFullSummary}>
                  {t('practicePage.viewDetailedReport')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">{t('practicePage.reportFailed')}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={handleEndPractice}>
                  {t('practicePage.regenerate')}
                </Button>
                <Button onClick={handleViewFullSummary}>
                  {t('practicePage.viewDetailedReport')}
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
