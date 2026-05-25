import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Badge';
import { PracticeModeSetup } from '@/components/practice/PracticeChat';
import { PracticeChat } from '@/components/practice/PracticeChat';
import { PracticeSummary } from '@/components/practice/PracticeSummary';
import { usePracticeStore, type PracticeMode } from '@/stores/practiceStore';

type PracticeView = 'setup' | 'chat' | 'summary';

export default function PracticePage() {
  const [view, setView] = useState<PracticeView>('setup');
  const { resetPractice, setSession } = usePracticeStore();

  const handleStartPractice = (mode: PracticeMode, options?: { scenarioId?: string; industry?: string; skillFocus?: string }) => {
    const scenarioNames: Record<string, string> = {
      're-1': '首次看房接待',
      're-2': '价格谈判',
      're-3': '处理客户犹豫',
      'au-1': '新车介绍',
      'au-2': '竞品对比',
      'au-3': '试驾后促单',
      'sa-1': '需求挖掘',
      'sa-2': '方案演示',
      'sa-3': '处理预算异议',
      'in-1': '保险需求分析',
      'in-2': '方案推荐',
      'in-3': '处理理赔担忧',
    };

    const skillNames: Record<string, string> = {
      objection: '异议处理',
      closing: '促单技巧',
      discovery: '需求挖掘',
      rapport: '建立信任',
      negotiation: '价格谈判',
      presentation: '产品演示',
    };

    setSession({
      id: `session-${Date.now()}`,
      mode,
      scenarioId: options?.scenarioId,
      scenarioName: options?.scenarioId ? scenarioNames[options.scenarioId] : undefined,
      industry: options?.industry,
      skillFocus: options?.skillFocus ? skillNames[options.skillFocus] : undefined,
      messages: [],
      round: 0,
      maxRounds: 10,
      customerEmotion: 'interest',
      state: 'practicing',
      startedAt: Date.now(),
    });
    setView('chat');
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
          <PracticeModeSetup onStart={handleStartPractice} />
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
