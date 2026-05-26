import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Badge';
import { PracticeModeSetup } from '@/components/practice/PracticeChat';
import { PracticeChat } from '@/components/practice/PracticeChat';
import { PracticeSummary } from '@/components/practice/PracticeSummary';
import { usePracticeStore, type PracticeMode } from '@/stores/practiceStore';
import { useActivityStore } from '@/stores/activityStore';
import { api } from '@/services/api';

type PracticeView = 'setup' | 'chat' | 'summary';

// Scenario name mapping
const SCENARIO_NAMES: Record<string, { name: string; description: string }> = {
  're-1': { name: '首次看房接待', description: '客户第一次来看房，需要建立信任' },
  're-2': { name: '价格谈判', description: '客户对价格有异议，需要谈判技巧' },
  're-3': { name: '处理客户犹豫', description: '客户犹豫不决，需要推动决策' },
  'au-1': { name: '新车介绍', description: '客户想了解新车，需要专业介绍' },
  'au-2': { name: '竞品对比', description: '客户在对比竞品，需要差异化分析' },
  'au-3': { name: '试驾后促单', description: '试驾后需要促成订单' },
  'sa-1': { name: '需求挖掘', description: '需要了解客户真实需求' },
  'sa-2': { name: '方案演示', description: '需要演示产品方案价值' },
  'sa-3': { name: '处理预算异议', description: '客户预算不足，需要灵活应对' },
  'in-1': { name: '保险需求分析', description: '需要分析客户保险需求' },
  'in-2': { name: '方案推荐', description: '需要推荐合适的保险方案' },
  'in-3': { name: '处理理赔担忧', description: '客户担心理赔，需要建立信心' },
};

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
  const { resetPractice, setSession } = usePracticeStore();
  const { addActivity } = useActivityStore();

  const handleStartPractice = async (mode: PracticeMode, options?: { scenarioId?: string; industry?: string; skillFocus?: string }) => {
    setIsStarting(true);

    try {
      const scenario = options?.scenarioId ? SCENARIO_NAMES[options.scenarioId] : null;

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
      });

      const initData = response.data.data;

      setSession({
        id: initData.session_id,
        mode,
        scenarioId: options?.scenarioId,
        scenarioName: scenario?.name,
        industry: options?.industry,
        skillFocus: options?.skillFocus,
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
        scenarioName: options?.scenarioId ? SCENARIO_NAMES[options.scenarioId]?.name : undefined,
        industry: options?.industry,
        skillFocus: options?.skillFocus,
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
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
                <p className="mt-4 text-sm text-gray-500">正在初始化AI陪练会话...</p>
              </div>
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
