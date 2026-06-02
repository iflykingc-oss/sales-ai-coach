import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Lightbulb, BookOpen, Brain, Clock, Target, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmotionIndicator } from './EmotionIndicator';
import { TalkTimeRatio } from './TalkTimeRatio';
import { SessionHealthIndicator } from './SessionHealthIndicator';
import { CustomScenarioBuilder, type CustomScenario } from './CustomScenarioBuilder';
import {
  usePracticeStore,
  type ChatMessage,
  type EmotionType,
  type PracticeMode,
} from '@/stores/practiceStore';
import { useCustomScenarioStore } from '@/stores/customScenarioStore';
import { cn } from '@/utils/cn';
import { practiceScenarios, industries, getScenariosByIndustry } from '@/data/practiceScenarios';
import { getFrameworkById } from '@sales-ai-coach/shared/data';

const skillFocusOptions = [
  { id: 'objection', name: '异议处理' },
  { id: 'closing', name: '促单技巧' },
  { id: 'discovery', name: '需求挖掘' },
  { id: 'rapport', name: '建立信任' },
  { id: 'negotiation', name: '价格谈判' },
  { id: 'presentation', name: '产品演示' },
];

const difficultyOptions = [
  { id: 'easy', name: '初级', desc: '友善型买家，少异议', icon: '🟢' },
  { id: 'medium', name: '中级', desc: '分析/表现型买家，适度异议', icon: '🟡' },
  { id: 'hard', name: '高级', desc: '驱动/怀疑型买家，强烈异议', icon: '🔴' },
  { id: 'expert', name: '地狱', desc: '组合型买家，多重异议', icon: '💀' },
];

interface PracticeModeSelectorProps {
  onStart: (mode: PracticeMode, options?: { scenarioId?: string; industry?: string; skillFocus?: string; difficulty?: string }) => void;
}

export function PracticeModeSetup({ onStart }: PracticeModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<PracticeMode | null>(null);
  const [selectedScenario, setSelectedScenario] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const { recentScenarioIds } = usePracticeStore();
  const { scenarios: customScenarios, addScenario } = useCustomScenarioStore();

  const recentScenarios = useMemo(() => {
    return recentScenarioIds
      .map((id) => practiceScenarios.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined);
  }, [recentScenarioIds]);

  const handleModeSelect = (mode: PracticeMode) => {
    setSelectedMode(mode);
    setSelectedScenario('');
    setSelectedSkill('');
  };

  const handleStart = () => {
    if (!selectedMode) return;
    // Check if it's a custom scenario
    const customScenario = customScenarios.find((s) => s.id === selectedScenario);
    const scenario = practiceScenarios.find((s) => s.id === selectedScenario);

    onStart(selectedMode, {
      scenarioId: selectedScenario || undefined,
      industry: customScenario?.industry || scenario?.industry,
      skillFocus: selectedSkill || undefined,
      difficulty: customScenario?.difficulty || selectedDifficulty,
    });
  };

  const handleSaveCustomScenario = (scenario: CustomScenario) => {
    addScenario(scenario);
    setSelectedScenario(scenario.id);
  };

  const canStart =
    selectedMode === 'freeform' ||
    (selectedMode === 'scenario' && selectedScenario) ||
    (selectedMode === 'special' && selectedSkill);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">选择陪练模式</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { mode: 'scenario' as const, icon: '\u{1F3AF}', title: '场景模拟', desc: '行业场景模拟' },
            { mode: 'freeform' as const, icon: '\u{1F4AC}', title: '实战对练', desc: '自由对话对练' },
            { mode: 'special' as const, icon: '⚡', title: '专项突破', desc: '专项技能强化' },
          ].map((m) => (
            <button
              key={m.mode}
              onClick={() => handleModeSelect(m.mode)}
              className={cn(
                'rounded-xl border-2 p-4 text-left transition-all',
                selectedMode === m.mode
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <div className="text-2xl">{m.icon}</div>
              <div className="mt-2 font-medium text-gray-900">{m.title}</div>
              <div className="text-sm text-gray-500">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {selectedMode === 'scenario' && (
        <div className="space-y-4">
          {/* Custom scenario button */}
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">选择场景</h4>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCustomBuilder(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              创建自定义场景
            </Button>
          </div>

          {/* Custom scenarios */}
          {customScenarios.length > 0 && (
            <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
              <h4 className="mb-3 flex items-center gap-2 font-medium text-primary-900">
                <Sparkles className="h-4 w-4 text-primary-500" />
                自定义场景
              </h4>
              <div className="flex flex-wrap gap-2">
                {customScenarios.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedScenario(s.id)}
                    className={cn(
                      'rounded-full border px-4 py-2 text-sm transition-colors',
                      selectedScenario === s.id
                        ? 'border-primary-500 bg-primary-100 text-primary-700'
                        : 'border-primary-200 bg-white text-primary-600 hover:border-primary-300',
                    )}
                  >
                    {s.name}
                    <span className="ml-1 text-xs text-primary-400">({s.industry})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent scenarios */}
          {recentScenarios.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
                <Clock className="h-4 w-4 text-gray-400" />
                最近使用
              </h4>
              <div className="flex flex-wrap gap-2">
                {recentScenarios.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedScenario(s.id)}
                    className={cn(
                      'rounded-full border px-4 py-2 text-sm transition-colors',
                      selectedScenario === s.id
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
                    )}
                  >
                    {s.name}
                    <span className="ml-1 text-xs text-gray-400">({s.industry})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All scenarios by industry */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h4 className="mb-3 font-medium text-gray-900">全部场景</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {industries.map((industry) => (
                <div key={industry} className="space-y-2">
                  <span className="text-sm font-medium text-gray-600">{industry}</span>
                  <div className="space-y-1">
                    {getScenariosByIndustry(industry).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedScenario(s.id)}
                        className={cn(
                          'block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                          selectedScenario === s.id
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
                        )}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Scenario Builder Dialog */}
          <CustomScenarioBuilder
            open={showCustomBuilder}
            onOpenChange={setShowCustomBuilder}
            onSave={handleSaveCustomScenario}
          />
        </div>
      )}

      {selectedMode === 'special' && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h4 className="font-medium text-gray-900">选择专项技能</h4>
          <div className="flex flex-wrap gap-2">
            {skillFocusOptions.map((skill) => (
              <button
                key={skill.id}
                onClick={() => setSelectedSkill(skill.id)}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm transition-colors',
                  selectedSkill === skill.id
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
                )}
              >
                {skill.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Logic Framework - Hidden from user, auto-selected by backend based on scenario/skill */}

      {/* Difficulty Selector */}
      <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-gray-400" />
          <h4 className="font-medium text-gray-900">难度等级</h4>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {difficultyOptions.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDifficulty(d.id)}
              className={cn(
                'rounded-lg border-2 p-3 text-center transition-all',
                selectedDifficulty === d.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <div className="text-xl">{d.icon}</div>
              <div className="mt-1 text-sm font-medium text-gray-900">{d.name}</div>
              <div className="mt-0.5 text-[10px] leading-tight text-gray-500">{d.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleStart} disabled={!canStart}>
          开始陪练
        </Button>
      </div>
    </div>
  );
}

// Chat message bubble component
function MessageBubble({ message }: { message: ChatMessage; isLast: boolean }) {
  const isUser = message.role === 'user';
  // Detect coaching messages by content prefix
  const isCoachHint = !isUser && message.content.startsWith('💡');
  const isCoachFeedback = !isUser && message.content.startsWith('📊');

  if (isCoachHint || isCoachFeedback) {
    return (
      <div className="mb-4 flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className={cn(
          'max-w-[85%] rounded-xl border px-4 py-3 text-sm',
          isCoachHint
            ? 'border-violet-200 bg-violet-50 text-violet-800'
            : 'border-blue-200 bg-blue-50 text-blue-800',
        )}>
          <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <div className="mt-1 text-[10px] text-gray-400 text-center">
            {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex mb-4',
      isUser ? 'justify-end' : 'justify-start',
      'animate-in fade-in slide-in-from-bottom-2 duration-300',
    )}>
      {!isUser && (
        <div className="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm">
          AI客
        </div>
      )}
      <div className={cn(
        'max-w-[70%] rounded-2xl px-4 py-3 transition-all',
        isUser
          ? 'bg-primary-600 text-white rounded-br-sm'
          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm',
      )}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        {message.emotion && !isUser && (
          <div className="mt-1.5 flex items-center gap-1">
            <span className="text-[10px] text-gray-400">情绪:</span>
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
              message.emotion === '感兴趣' || message.emotion === '共情' || message.emotion === '满意'
                ? 'bg-green-50 text-green-600'
                : message.emotion === '犹豫'
                  ? 'bg-yellow-50 text-yellow-600'
                  : 'bg-red-50 text-red-600',
            )}>
              {message.emotion}
            </span>
            {message.roundScore != null && (
              <span className={cn(
                'ml-1 rounded px-1 py-0.5 text-[10px] font-medium',
                message.roundScore >= 0.7 ? 'bg-green-50 text-green-600' : message.roundScore >= 0.5 ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600',
              )}>
                {Math.round(message.roundScore * 100)}分
              </span>
            )}
          </div>
        )}
        <div className={cn('mt-1 text-[10px]', isUser ? 'text-white/60' : 'text-gray-400')}>
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      {isUser && (
        <div className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm text-white">
          我
        </div>
      )}
    </div>
  );
}

interface PracticeChatProps {
  onEnd: () => void;
}

export function PracticeChat({ onEnd }: PracticeChatProps) {
  const { session, addMessage, incrementRound, setCustomerEmotion, completePractice, setDetectedStage } = usePracticeStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPsychology, setShowPsychology] = useState(false);
  const [showBenchmark, setShowBenchmark] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  const handleSend = async () => {
    if (!input.trim() || !session || session.round >= session.maxRounds || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    addMessage(userMessage);
    incrementRound();
    setInput('');
    setIsLoading(true);

    // Create placeholder AI message for streaming
    const aiMsgId = `msg-${Date.now() + 1}`;
    const placeholder: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    addMessage(placeholder);

    const updateAiMessage = (updates: Partial<ChatMessage>) => {
      usePracticeStore.setState((state) => {
        if (!state.session) return state;
        return {
          session: {
            ...state.session,
            messages: state.session.messages.map((m) =>
              m.id === aiMsgId ? { ...m, ...updates } : m,
            ),
          },
        };
      });
    };

    try {
      const response = await fetch('/api/practices/message/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          message: userMessage.content,
          logicFramework: session.logicFramework || '',
        }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let streamedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'token') {
              streamedContent += event.content;
              updateAiMessage({ content: streamedContent });
            }

            if (event.type === 'done') {
              const data = event.data;
              const emotionMap: Record<string, EmotionType> = {
                '共情': 'empathy', '感兴趣': 'interest', '犹豫': 'hesitate',
                '抗拒': 'resist', '敷衍': 'resist', '中立': 'interest', '满意': 'interest',
              };
              setCustomerEmotion(emotionMap[data.emotion] || 'interest');
              if (data.detectedStage) setDetectedStage(data.detectedStage);

              updateAiMessage({
                content: data.response || streamedContent,
                emotion: data.emotion,
                roundScore: data.round_score,
                evaluationFeedback: data.evaluation_feedback,
              });

              // Show coaching feedback after each round (round 2+)
              if (data.evaluation_feedback && data.round >= 2) {
                const dimScores = data.dimension_scores || {};
                const weakDims = Object.entries(dimScores)
                  .sort(([, a], [, b]) => (a as number) - (b as number))
                  .slice(0, 2)
                  .map(([k, v]) => `${k}(${Math.round((v as number) * 100)}分)`)
                  .join('、');

                const coachMsg: ChatMessage = {
                  id: `coach-${Date.now()}`,
                  role: 'assistant',
                  content: `📊 第${data.round}轮评估: ${data.evaluation_feedback}${weakDims ? `\n\n需加强: ${weakDims}` : ''}`,
                  timestamp: Date.now(),
                };
                usePracticeStore.setState((state) => {
                  if (!state.session) return state;
                  return {
                    session: {
                      ...state.session,
                      messages: [...state.session.messages, coachMsg],
                    },
                  };
                });
              }

              if (data.is_complete) completePractice();
            }

            if (event.type === 'error') {
              throw new Error(event.data?.error || 'Stream error');
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch {
      updateAiMessage({ content: '抱歉，AI服务暂时不可用，请稍后再试。' });
    } finally {
      setIsLoading(false);
    }
  };

  const [hintLoading, setHintLoading] = useState(false);

  const handleSuggestion = async () => {
    if (!session || session.messages.length === 0 || hintLoading) return;

    setHintLoading(true);
    try {
      const res = await fetch('/api/practices/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
        credentials: 'include',
      });
      const json = await res.json();
      const hintData = json.data || json;

      const hint = hintData.hint || '观察客户反应，调整沟通策略。';
      const extra = hintData.stageTip || hintData.emotionTip || '';

      addMessage({
        id: `hint-${Date.now()}`,
        role: 'assistant',
        content: `💡 教练提示: ${hint}${extra ? `\n\n${extra}` : ''}`,
        timestamp: Date.now(),
        suggestion: hint,
      });
    } catch {
      addMessage({
        id: `hint-${Date.now()}`,
        role: 'assistant',
        content: '💡 教练提示: 观察客户反应，根据情绪调整策略。',
        timestamp: Date.now(),
        suggestion: '观察客户反应，根据情绪调整策略。',
      });
    } finally {
      setHintLoading(false);
    }
  };

  const handleEnd = () => {
    completePractice();
    onEnd();
  };

  if (!session) return null;

  const isMaxRounds = session.round >= session.maxRounds;
  const currentFramework = session.logicFramework ? getFrameworkById(session.logicFramework) : null;

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <EmotionIndicator emotion={session.customerEmotion} />
          <span className="text-sm text-gray-500">
            第 {session.round}/{session.maxRounds} 轮
          </span>
          {session.scenarioName && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {session.scenarioName}
            </span>
          )}
          {currentFramework && (
            <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-600">
              {currentFramework.name}
            </span>
          )}
          {/* Talk-time ratio */}
          {session.userCharCount !== undefined && session.userCharCount > 0 && (
            <TalkTimeRatio
              userCharCount={session.userCharCount}
              assistantCharCount={session.assistantCharCount || 0}
            />
          )}
          {/* Session health indicator */}
          <SessionHealthIndicator
            emotion={session.customerEmotion}
            round={session.round}
            maxRounds={session.maxRounds}
            roundScores={session.messages
              .filter((m) => m.roundScore !== undefined)
              .map((m) => m.roundScore as number)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleSuggestion} disabled={isLoading || hintLoading}>
            <Lightbulb className="mr-1 h-3.5 w-3.5" />
            {hintLoading ? '生成中...' : '教练提示'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowBenchmark(!showBenchmark)}
          >
            <BookOpen className="mr-1 h-3.5 w-3.5" />
            查看最佳话术
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowPsychology(!showPsychology)}
          >
            <Brain className="mr-1 h-3.5 w-3.5" />
            提示客户心理
          </Button>
          <Button variant="danger" size="sm" onClick={handleEnd}>
            结束陪练
          </Button>
        </div>
      </div>

      {/* Auxiliary panels */}
      {currentFramework && (
        <div className="border-b border-gray-200 bg-gradient-to-r from-primary-50 to-blue-50 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-3.5 w-3.5 text-primary-500" />
            <span className="text-xs font-medium text-primary-700">销售逻辑框架</span>
            <span className="text-xs text-primary-600">{currentFramework.name}</span>
          </div>
          <div className="flex gap-2">
            {currentFramework.stages.map((stage, idx) => {
              const currentStage = session.detectedStage || '';
              const isActive = stage.id === currentStage;
              const isPast = currentStage !== '' &&
                currentFramework.stages.findIndex((s) => s.id === currentStage) > idx;
              return (
                <div
                  key={stage.id}
                  className={cn(
                    'flex flex-1 items-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors',
                    isActive
                      ? 'bg-primary-500 text-white shadow-sm'
                      : isPast
                        ? 'bg-primary-100 text-primary-600'
                        : 'bg-white/60 text-gray-400',
                  )}
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/30 text-[10px] font-bold">
                    {isPast ? '✓' : idx + 1}
                  </span>
                  <span className="truncate">{stage.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showPsychology && (
        <div className="border-b border-gray-200 bg-amber-50 px-4 py-3">
          <h4 className="text-sm font-medium text-amber-800">客户心理分析</h4>
          <div className="mt-1 space-y-1 text-sm text-amber-700">
            <p>
              当前情绪: <span className="font-medium">{
                session.customerEmotion === 'interest' ? '感兴趣 — 有进一步了解意愿，可以适当推进' :
                session.customerEmotion === 'hesitate' ? '犹豫 — 存在顾虑，需要提供更多信心支持' :
                session.customerEmotion === 'resist' ? '抗拒 — 防御心理较强，先缓和气氛再推进' :
                session.customerEmotion === 'empathy' ? '共情 — 情感上产生共鸣，是推进的好时机' :
                session.customerEmotion
              }</span>
            </p>
            {session.messages.filter(m => m.emotion).length > 0 && (
              <p className="text-xs text-amber-600">
                情绪轨迹: {session.messages.filter(m => m.emotion).map(m => m.emotion).join(' → ')}
              </p>
            )}
          </div>
        </div>
      )}

      {showBenchmark && currentFramework && (
        <div className="border-b border-gray-200 bg-blue-50 px-4 py-3">
          <h4 className="text-sm font-medium text-blue-800">{currentFramework.name} — 阶段指导</h4>
          <div className="mt-2 space-y-2">
            {currentFramework.stages.map((stage) => {
              const isActive = stage.id === session.detectedStage;
              return (
                <div key={stage.id} className={cn('rounded-lg p-2 text-xs', isActive ? 'bg-blue-100 border border-blue-300' : 'bg-white/60')}>
                  <p className="font-medium text-blue-800">{stage.name} {isActive && '(当前)'}</p>
                  <p className="text-blue-600">{stage.purpose}</p>
                  {stage.keyQuestions && stage.keyQuestions.length > 0 && (
                    <p className="mt-1 text-blue-500">关键问题: {stage.keyQuestions.slice(0, 2).join('、')}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
        {session.messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="mb-2 text-4xl">💬</div>
              <p>开始与AI客户对话吧</p>
            </div>
          </div>
        )}
        {session.messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLast={idx === session.messages.length - 1}
          />
        ))}
        {isLoading && (
          <div className="mb-4 flex justify-start animate-in fade-in slide-in-from-bottom-1 duration-300">
            <div className="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm">
              AI客
            </div>
            <div className="flex items-center gap-1 rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        {isMaxRounds ? (
          <div className="rounded-lg bg-gray-100 px-4 py-3 text-center text-sm text-gray-500">
            已达到最大轮数，点击「结束陪练」查看结果
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入你的回复..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
