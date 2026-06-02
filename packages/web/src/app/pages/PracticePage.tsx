import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { PracticeModeSetup } from '@/components/practice/PracticeChat';
import { PracticeChat } from '@/components/practice/PracticeChat';
import { PracticeSummary } from '@/components/practice/PracticeSummaryNew';
import { usePracticeStore, type PracticeMode } from '@/stores/practiceStore';
import { useActivityStore } from '@/stores/activityStore';
import { useAchievementStore } from '@/stores/achievementStore';
import { toast } from '@/hooks/useToast';
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
  const location = useLocation();
  const navState = location.state as {
    sessionId?: string;
    scriptId?: string;
    scenario?: string;
    industry?: string;
    fromScript?: boolean;
  } | null;
  const [view, setView] = useState<PracticeView>('setup');
  const [isStarting, setIsStarting] = useState(false);
  const { resetPractice, setSession, addRecentScenario } = usePracticeStore();
  const { addActivity } = useActivityStore();
  const { achievements, fetchAchievements, checkNewAchievements, showUnlockNotifications } = useAchievementStore();
  const previousUnlockedRef = useRef<string[]>([]);

  // Check achievements when practice completes (view transitions to 'summary')
  useEffect(() => {
    if (view === 'summary') {
      const checkAchievements = async () => {
        // Fetch latest achievements first if not loaded
        if (achievements.length === 0) {
          await fetchAchievements();
        }
        const currentUnlocked = useAchievementStore.getState().achievements
          .filter((a) => a.unlocked)
          .map((a) => a.id);
        const newlyUnlocked = await checkNewAchievements(previousUnlockedRef.current.length > 0 ? previousUnlockedRef.current : currentUnlocked);
        if (newlyUnlocked.length > 0) {
          showUnlockNotifications(newlyUnlocked);
          // Refresh achievements list
          await fetchAchievements();
        }
      };
      checkAchievements();
    }
  }, [view]);

  const handleStartPractice = async (mode: PracticeMode, options?: { scenarioId?: string; industry?: string; skillFocus?: string; difficulty?: string }) => {
    setIsStarting(true);

    // Save currently unlocked achievements for comparison after practice
    previousUnlockedRef.current = achievements.filter((a) => a.unlocked).map((a) => a.id);

    try {
      const scenario = options?.scenarioId ? practiceScenarios.find((s) => s.id === options.scenarioId) : null;

      // Build scenario description for the AI
      let scenarioDesc = '';
      if (scenario) {
        scenarioDesc = `${scenario.name}: ${scenario.description}`;
      } else if (options?.skillFocus) {
        scenarioDesc = `专项练习: ${SKILL_NAMES[options.skillFocus] || options.skillFocus}`;
      } else {
        // Freeform mode - use a default scenario
        scenarioDesc = '客户初次拜访：你正在拜访一位潜在客户，对方对你所在公司的产品/服务有一定兴趣，但还没有明确需求。你需要通过对话了解客户的真实需求，建立信任关系。';
      }

      // Initialize session with the harness-powered API
      const response = await api.post('/practices/init', {
        scenario: scenarioDesc,
        industry: options?.industry || navState?.industry || '通用',
        mode: mode === 'freeform' ? 'freestyle' : 'scenario',
        maxRounds: 10,
        sessionId: navState?.sessionId || '',
        scriptId: navState?.scriptId || '',
        skillFocus: options?.skillFocus || '',
        difficulty: options?.difficulty || 'medium',
      });

      const initData = response.data.data;

      const greetingMessage = initData.greeting
        ? [{
            id: `msg-${Date.now()}`,
            role: 'assistant' as const,
            content: initData.greeting,
            timestamp: Date.now(),
          }]
        : [];

      setSession({
        id: initData.session_id,
        mode,
        scenarioId: options?.scenarioId,
        scenarioName: scenario?.name,
        industry: options?.industry || navState?.industry,
        skillFocus: options?.skillFocus,
        difficulty: options?.difficulty,
        archetypeName: initData.archetype_name,
        linkedSessionId: navState?.sessionId,
        linkedScriptId: navState?.scriptId,
        messages: greetingMessage,
        round: 0,
        maxRounds: 10,
        customerEmotion: 'interest',
        state: 'practicing',
        startedAt: Date.now(),
      });

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
