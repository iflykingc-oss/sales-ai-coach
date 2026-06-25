import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Lightbulb, BookOpen, Brain, Clock, Target, Plus, Sparkles, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmotionIndicator } from './EmotionIndicator';
import { TalkTimeRatio } from './TalkTimeRatio';
import { SessionHealthIndicator } from './SessionHealthIndicator';
import { CustomScenarioBuilder, type CustomScenario } from './CustomScenarioBuilder';
import { DocumentUpload } from './DocumentUpload';
import { toast } from '@/hooks/useToast';
import {
  usePracticeStore,
  type ChatMessage,
  type EmotionType,
  type PracticeMode,
} from '@/stores/practiceStore';
import { useCustomScenarioStore } from '@/stores/customScenarioStore';
import { useTranslation } from 'react-i18next';
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
  onStart: (mode: PracticeMode, options?: { scenarioId?: string; industry?: string; skillFocus?: string; difficulty?: string; documentContext?: string }) => void;
}

export function PracticeModeSetup({ onStart }: PracticeModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<PracticeMode | null>(null);
  const [selectedScenario, setSelectedScenario] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
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

    // Build document context from uploaded documents
    const documentContext = uploadedDocuments.length > 0
      ? uploadedDocuments.map(d => `【${d.name}】\n${d.summary || d.content.slice(0, 500)}`).join('\n\n')
      : undefined;

    onStart(selectedMode, {
      scenarioId: selectedScenario || undefined,
      industry: customScenario?.industry || scenario?.industry,
      skillFocus: selectedSkill || undefined,
      difficulty: customScenario?.difficulty || selectedDifficulty,
      documentContext,
    });
  };

  const handleSaveCustomScenario = (scenario: CustomScenario) => {
    addScenario(scenario);
    setSelectedScenario(scenario.id);
  };

  const handleDocumentsReady = (docs: any[]) => {
    setUploadedDocuments(docs);
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
              aria-pressed={selectedMode === m.mode}
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

      {/* Document Upload */}
      <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileUp className="h-4 w-4 text-gray-400" />
            <h4 className="font-medium text-gray-900">上传培训资料（可选）</h4>
          </div>
          <button
            onClick={() => setShowDocumentUpload(!showDocumentUpload)}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            {showDocumentUpload ? '收起' : '展开'}
          </button>
        </div>
        {showDocumentUpload && (
          <div className="mt-3">
            <p className="mb-3 text-xs text-gray-500">
              上传企业内部培训资料、产品文档等，AI将分析内容并进行针对性陪练
            </p>
            <DocumentUpload
              onDocumentsReady={handleDocumentsReady}
              maxFiles={3}
              maxSizeMB={5}
            />
          </div>
        )}
      </div>

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

// Chat message bubble component - memoized for performance
const MessageBubble = React.memo(function MessageBubble({ message }: { message: ChatMessage }) {
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
        {/* Coaching moments */}
        {!isUser && message.coachingMoments && message.coachingMoments.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.coachingMoments.map((moment, idx) => (
              <div key={idx} className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-medium text-amber-700">💡 {moment.dimension}</span>
                </div>
                <p className="text-[11px] text-gray-600 mb-0.5">
                  <span className="font-medium">你说：</span>"{moment.user_quote}"
                </p>
                {moment.issue && (
                  <p className="text-[11px] text-red-600 mb-0.5">❌ {moment.issue}</p>
                )}
                <p className="text-[11px] text-amber-800">✅ {moment.improve}</p>
              </div>
            ))}
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
});

interface PracticeChatProps {
  onEnd: () => void;
}

export function PracticeChat({ onEnd }: PracticeChatProps) {
  const { session, addMessage, incrementRound, setCustomerEmotion, completePractice, setDetectedStage } = usePracticeStore();
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPsychology, setShowPsychology] = useState(false);
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [coachingTip, setCoachingTip] = useState<string | null>(null);
  const [coachingTipType, setCoachingTipType] = useState<'feedback' | 'hint' | 'progress'>('feedback');
  const [selectedObjectionType, setSelectedObjectionType] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  const handleSend = async () => {
    if (!input.trim() || !session || session.round >= session.maxRounds || isLoading) return;

    // In objection training mode, prepend the selected objection type
    let messageContent = input.trim();
    if (session.mode === 'objection_training' && selectedObjectionType) {
      messageContent = `[异议类型判断: ${selectedObjectionType}] ${messageContent}`;
      setSelectedObjectionType(null);
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: messageContent,
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

    // AbortController for cancellation + timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min timeout

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
        signal: controller.signal,
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
                coachingMoments: data.coaching_moments || [],
                objectionTraining: data.objection_training || false,
                objectionText: data.objection_text || undefined,
                objectionTypes: data.objection_types || undefined,
              });

              // Show coaching feedback as a side panel (not in chat)
              if (data.evaluation_feedback && data.round >= 2) {
                const dimScores = data.dimension_scores || {};
                const weakDims = Object.entries(dimScores)
                  .sort(([, a], [, b]) => (a as number) - (b as number))
                  .slice(0, 2)
                  .map(([k, v]) => `${k}(${Math.round((v as number) * 100)}分)`)
                  .join('、');
                const avgScore = data.round_score || 0;

                setCoachingTip(`第${data.round}轮: ${data.evaluation_feedback}${weakDims ? ` | 需加强: ${weakDims}` : ''}`);
                setCoachingTipType('feedback');

                // Auto-hint when score is low
                if (avgScore < 0.5 && data.round >= 3) {
                  setTimeout(async () => {
                    try {
                      const hintRes = await fetch('/api/practices/hint', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId: session.id, scenario: session.scenarioName, round: data.round }),
                        credentials: 'include',
                      });
                      const hintJson = await hintRes.json();
                      const hint = hintJson.data?.hint || '注意调整沟通策略，关注客户反应。';
                      setCoachingTip(`💡 ${hint}`);
                      setCoachingTipType('hint');
                    } catch { /* ignore */ }
                  }, 1500);
                }

                // Emotion alert
                const recentEmotions = usePracticeStore.getState().session?.messages
                  .filter(m => m.emotion)
                  .slice(-3)
                  .map(m => m.emotion) || [];
                const negativeCount = recentEmotions.filter(e =>
                  e === '抗拒' || e === '生气' || e === '犹豫'
                ).length;
                if (negativeCount >= 2 && data.round >= 3) {
                  setCoachingTip(`⚠️ 客户连续${negativeCount}轮消极情绪，建议先缓和气氛，使用共情话术`);
                  setCoachingTipType('hint');
                }
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
    } catch (err) {
      clearTimeout(timeout);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const errorMsg = isAbort ? '请求超时，请稍后重试' : 'AI服务暂时不可用，请稍后再试';
      updateAiMessage({ content: `⚠️ ${errorMsg}` });
      toast.error(errorMsg);
    } finally {
      clearTimeout(timeout);
      controller.abort(); // Clean up stream
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

  if (!session) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Target className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">会话未找到</h3>
          <p className="text-sm text-gray-500">请重新开始陪练</p>
        </div>
      </div>
    );
  }

  const isMaxRounds = session.round >= session.maxRounds;
  const currentFramework = session.logicFramework ? getFrameworkById(session.logicFramework) : null;

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <EmotionIndicator emotion={session.customerEmotion} />
          <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
            {session.round}/{session.maxRounds}
          </span>
          {session.scenarioName && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 truncate max-w-[120px] sm:max-w-none">
              {session.scenarioName}
            </span>
          )}
          {currentFramework && (
            <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-600 hidden sm:inline">
              {currentFramework.name}
            </span>
          )}
          {/* Talk-time ratio - hidden on mobile */}
          {session.userCharCount !== undefined && session.userCharCount > 0 && (
            <div className="hidden sm:block">
              <TalkTimeRatio
                userCharCount={session.userCharCount}
                assistantCharCount={session.assistantCharCount || 0}
              />
            </div>
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
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="secondary" size="sm" onClick={handleSuggestion} disabled={isLoading || hintLoading}>
            <Lightbulb className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">{hintLoading ? t('common.loading') : t('coaching.hint')}</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowBenchmark(!showBenchmark)}
          >
            <BookOpen className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">{t('practice.bestScript', 'Best Script')}</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowPsychology(!showPsychology)}
          >
            <Brain className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">{t('practice.customerPsychology', 'Customer Psychology')}</span>
          </Button>
          <Button variant="danger" size="sm" onClick={handleEnd}>
            <span className="hidden sm:inline">{t('practice.end')}</span>
            <span className="sm:hidden">{t('common.close')}</span>
          </Button>
        </div>
      </div>

      {/* Auxiliary panels */}
      {currentFramework && (
        <div className="border-b border-gray-200 bg-gradient-to-r from-primary-50 to-blue-50 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-3.5 w-3.5 text-primary-500" />
            <span className="text-xs font-medium text-primary-700">{t('practice.framework', 'Sales Framework')}</span>
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

      {/* Coaching tip panel */}
      {coachingTip && (
        <div className={cn(
          'border-b px-4 py-2.5 text-sm animate-in fade-in slide-in-from-top-2 duration-300',
          coachingTipType === 'hint' ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-blue-50 border-blue-200 text-blue-700',
        )}>
          <div className="flex items-center justify-between">
            <span className="leading-relaxed">{coachingTip}</span>
            <button onClick={() => setCoachingTip(null)} className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0">✕</button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
        {session.messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="mb-2 text-4xl">💬</div>
              <p>{t('practice.startChat', 'Start a conversation with AI customer')}</p>
            </div>
          </div>
        )}
        {session.messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
          />
        ))}
        {isLoading && (
          <div className="mb-4 flex justify-start animate-in fade-in slide-in-from-bottom-1 duration-300">
            <div className="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm">
              {session?.archetypeName?.charAt(0) || '客'}
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
          <div className="space-y-2">
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-center text-sm text-amber-700">
              🎯 {t('coaching.maxRounds', `对话已进行 ${session.round} 轮，可以结束了。`).replace('{round}', String(session.round))}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={handleEnd}>
                {t('coaching.endAndView')}
              </Button>
              <Button variant="primary" className="flex-1" onClick={() => {
                usePracticeStore.setState((state) => {
                  if (!state.session) return state;
                  return { session: { ...state.session, maxRounds: state.session.maxRounds + 5 } };
                });
              }}>
                {t('coaching.continue')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Objection training: show objection type selection */}
            {session?.mode === 'objection_training' && (() => {
              const lastAssistantMsg = [...(session?.messages || [])].reverse().find(m => m.role === 'assistant');
              const isObjectionRound = lastAssistantMsg?.objectionTraining;
              if (!isObjectionRound) return null;

              const objectionTypes = [
                { key: 'trust', label: '信任异议', desc: '客户不信你/你的产品', color: 'blue' },
                { key: 'value', label: '价值异议', desc: '客户觉得不值/太贵', color: 'amber' },
                { key: 'authority', label: '权力异议', desc: '客户没权决定', color: 'purple' },
                { key: 'priority', label: '优先级异议', desc: '客户觉得不急', color: 'gray' },
                { key: 'fear', label: '恐惧异议', desc: '客户怕选错/怕风险', color: 'red' },
              ];

              return (
                <div className="mb-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <p className="mb-2 text-xs font-medium text-orange-700">🎯 这是什么类型的异议？</p>
                  <div className="flex flex-wrap gap-1.5">
                    {objectionTypes.map(({ key, label, desc }) => (
                      <button
                        key={key}
                        onClick={() => setSelectedObjectionType(key)}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium transition-all',
                          selectedObjectionType === key
                            ? 'bg-orange-500 text-white'
                            : 'bg-white text-gray-600 border border-gray-300 hover:border-orange-300'
                        )}
                        title={desc}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

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
                placeholder={session?.mode === 'objection_training' && selectedObjectionType
                  ? '输入你的应对话术...'
                  : t('practice.inputPlaceholder')}
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
