import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

type PracticeView = 'setup' | 'chat' | 'summary';

export default function PracticePage() {
  const navigate = useNavigate();
  const [view, setView] = useState<PracticeView>('setup');
  const [isStarting, setIsStarting] = useState(false);
  const { resetPractice, setSession } = usePracticeStore();
  const { addActivity } = useActivityStore();

  const handleStartPractice = async (config: {
    scenarioId: string;
    scenarioTitle: string;
    scenarioDesc: string;
    difficulty: string;
    greeting: string;
    customerProfile: string;
    objectives: string[];
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
        industry: '通用',
        mode: 'scenario',
        maxRounds: 10,
        difficulty: config.difficulty,
        knowledgeContext: config.documentContext || '',
      });

      const initData = response.data.data;

      // Use the greeting from config or from API
      const greeting = initData.greeting || config.greeting;

      setSession({
        id: initData.session_id,
        mode: 'scenario' as PracticeMode,
        scenarioId: config.scenarioId,
        scenarioName: config.scenarioTitle,
        difficulty: config.difficulty,
        archetypeName: initData.archetype_name,
        messages: greeting ? [{
          id: `msg-${Date.now()}`,
          role: 'assistant' as const,
          content: greeting,
          timestamp: Date.now(),
        }] : [],
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

  const handleEndPractice = () => {
    setView('summary');
  };

  const handleRestart = () => {
    resetPractice();
    setView('setup');
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">AI 陪练</h2>
          <p className="mt-1 text-sm text-gray-500">
            {view === 'setup' && '选择场景，开始与AI客户对话练习'}
            {view === 'chat' && '与AI客户对话中'}
            {view === 'summary' && '查看练习报告'}
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

      {view === 'summary' && (
        <PracticeSummary onRestart={handleRestart} />
      )}
    </div>
  );
}
