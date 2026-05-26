import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { PracticeModeSetup } from '@/components/practice/PracticeChat';
import { PracticeChat } from '@/components/practice/PracticeChat';
import { PracticeSummary } from '@/components/practice/PracticeSummary';
import { usePracticeStore, type PracticeMode } from '@/stores/practiceStore';
import { useActivityStore } from '@/stores/activityStore';
import { api } from '@/services/api';
import { practiceScenarios } from '@/data/practiceScenarios';

type PracticeView = 'setup' | 'chat' | 'summary';

const SKILL_NAMES: Record<string, string> = {
  objection: '异议处理',
  closing: '促单技巧',
  discovery: '需求挖掘',
  rapport: '建立信任',
  negotiation: '价格谈判',
  presentation: '产品演示',
};

export default function PracticePage() {
  const [view, setView] = useState<PracticeView>('setup');
  const [isStarting, setIsStarting] = useState(false);
  const { resetPractice, setSession, addRecentScenario } = usePracticeStore();
  const { addActivity } = useActivityStore();

  const handleStartPractice = async (mode: PracticeMode, options?: { scenarioId?: string; industry?: string; skillFocus?: string; logicFramework?: string }) => {
    setIsStarting(true);

    try {
      const scenario = options?.scenarioId ? practiceScenarios.find((s) => s.id === options.scenarioId) : null;

      // Build scenario description for the AI
      const scenarioDesc = scenario
        ? `${scenario.name}: ${scenario.description}`
        : options?.skillFocus
          ? `专项练习: ${SKILL_NAMES[options.skillFocus] || options.skillFocus}`
          : '自由对话对练';

      // Initialize session with the harness-powered API
      const response = await api.post('/practices/init', {
        scenario: scenarioDesc,
        industry: options?.industry || '',
        mode: mode === 'freeform' ? 'freestyle' : 'scenario',
        maxRounds: 10,
        logicFramework: options?.logicFramework || '',
      });

      const initData = response.data.data;

      setSession({
        id: initData.session_id,
        mode,
        scenarioId: options?.scenarioId,
        scenarioName: scenario?.name,
        industry: options?.industry,
        skillFocus: options?.skillFocus,
        logicFramework: options?.logicFramework,
        messages: [],
        round: 0,
        maxRounds: 10,
        customerEmotion: 'interest',
        state: 'practicing',
        startedAt: Date.now(),
      });

      // Add the AI customer's greeting message
      if (initData.greeting) {
        setSession({
          id: initData.session_id,
          mode,
          scenarioId: options?.scenarioId,
          scenarioName: scenario?.name,
          industry: options?.industry,
          skillFocus: options?.skillFocus,
          logicFramework: options?.logicFramework,
          messages: [
            {
              id: `msg-${Date.now()}`,
              role: 'assistant',
              content: initData.greeting,
              timestamp: Date.now(),
            },
          ],
          round: 0,
          maxRounds: 10,
          customerEmotion: 'interest',
          state: 'practicing',
          startedAt: Date.now(),
        });
      }

      setView('chat');
      if (options?.scenarioId) {
        addRecentScenario(options.scenarioId);
      }
      addActivity({
        type: 'practice_session',
        title: '开始陪练',
        description: scenario?.name || (mode === 'freeform' ? '自由对练' : '专项练习'),
      });
    } catch (error) {
      console.error('Failed to initialize practice session:', error);
      // Fallback: create local session without API
      setSession({
        id: `session-${Date.now()}`,
        mode,
        scenarioId: options?.scenarioId,
        scenarioName: options?.scenarioId ? practiceScenarios.find((s) => s.id === options.scenarioId)?.name : undefined,
        industry: options?.industry,
        skillFocus: options?.skillFocus,
        logicFramework: options?.logicFramework,
        messages: [],
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
        description: '自由对练',
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndPractice = () => {
    setView('summary');
  };

  const handleRestart = () => {
    resetPractice();
    setView('setup');
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">AI 陪练系统</h2>
          <p className="mt-1 text-sm text-gray-500">
            {view === 'setup' && '选择陪练模式，开始你的销售技能训练'}
            {view === 'chat' && '与 AI 客户进行真实对话练习'}
            {view === 'summary' && '查看本次陪练的详细评估报告'}
          </p>
        </div>
        {view !== 'setup' && (
          <Button variant="ghost" size="sm" onClick={handleRestart}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            返回选择
          </Button>
        )}
      </div>

      {view === 'setup' && (
        <Card>
          {isStarting ? (
            <div className="space-y-4 py-8">
              <div className="flex items-center gap-3 px-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                <p className="text-sm text-gray-500">正在初始化AI陪练会话...</p>
              </div>
              <Skeleton.Line className="h-4 w-3/4 mx-4" />
              <Skeleton.Line className="h-4 w-full mx-4" />
              <Skeleton.Line className="h-4 w-2/3 mx-4" />
            </div>
          ) : (
            <PracticeModeSetup onStart={handleStartPractice} />
          )}
        </Card>
      )}

      {view === 'chat' && (
        <Card className="overflow-hidden p-0">
          <PracticeChat onEnd={handleEndPractice} />
        </Card>
      )}

      {view === 'summary' && (
        <PracticeSummary onRestart={handleRestart} />
      )}
    </div>
  );
}
