import { useState, useRef, useEffect } from 'react';
import { Send, Lightbulb, BookOpen, Brain, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmotionIndicator } from './EmotionIndicator';
import {
  usePracticeStore,
  type ChatMessage,
  type EmotionType,
  type PracticeMode,
} from '@/stores/practiceStore';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';

const industryScenarios: Record<string, { id: string; name: string; industry: string }[]> = {
  realEstate: [
    { id: 're-1', name: '首次看房接待', industry: '房地产' },
    { id: 're-2', name: '价格谈判', industry: '房地产' },
    { id: 're-3', name: '处理客户犹豫', industry: '房地产' },
  ],
  auto: [
    { id: 'au-1', name: '新车介绍', industry: '汽车' },
    { id: 'au-2', name: '竞品对比', industry: '汽车' },
    { id: 'au-3', name: '试驾后促单', industry: '汽车' },
  ],
  saas: [
    { id: 'sa-1', name: '需求挖掘', industry: 'SaaS' },
    { id: 'sa-2', name: '方案演示', industry: 'SaaS' },
    { id: 'sa-3', name: '处理预算异议', industry: 'SaaS' },
  ],
  insurance: [
    { id: 'in-1', name: '保险需求分析', industry: '保险' },
    { id: 'in-2', name: '方案推荐', industry: '保险' },
    { id: 'in-3', name: '处理理赔担忧', industry: '保险' },
  ],
};

const skillFocusOptions = [
  { id: 'objection', name: '异议处理' },
  { id: 'closing', name: '促单技巧' },
  { id: 'discovery', name: '需求挖掘' },
  { id: 'rapport', name: '建立信任' },
  { id: 'negotiation', name: '价格谈判' },
  { id: 'presentation', name: '产品演示' },
];

interface PracticeModeSelectorProps {
  onStart: (mode: PracticeMode, options?: { scenarioId?: string; industry?: string; skillFocus?: string }) => void;
}

export function PracticeModeSetup({ onStart }: PracticeModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<PracticeMode | null>(null);
  const [selectedScenario, setSelectedScenario] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');

  const handleModeSelect = (mode: PracticeMode) => {
    setSelectedMode(mode);
    setSelectedScenario('');
    setSelectedIndustry('');
    setSelectedSkill('');
  };

  const handleStart = () => {
    if (!selectedMode) return;
    const scenario = industryScenarios[selectedIndustry]?.find((s) => s.id === selectedScenario);
    onStart(selectedMode, {
      scenarioId: selectedScenario || undefined,
      industry: scenario?.industry,
      skillFocus: selectedSkill || undefined,
    });
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
            { mode: 'scenario' as const, icon: '🎯', title: '场景模拟', desc: '行业场景模拟' },
            { mode: 'freeform' as const, icon: '💬', title: '实战对练', desc: '自由对话对练' },
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
        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h4 className="font-medium text-gray-900">选择行业场景</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(industryScenarios).map(([key, scenarios]) => (
              <div key={key} className="space-y-2">
                <span className="text-sm font-medium text-gray-600">{scenarios[0]?.industry}</span>
                <div className="space-y-1">
                  {scenarios.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedScenario(s.id);
                        setSelectedIndustry(s.industry);
                      }}
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

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start', 'mb-4')}>
      {!isUser && (
        <div className="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm">
          AI客
        </div>
      )}
      <div className={cn('max-w-[70%] rounded-2xl px-4 py-3', isUser ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-800')}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        {message.suggestion && (
          <div className={cn('mt-2 rounded-lg border p-2 text-xs', isUser ? 'border-white/30 bg-white/10' : 'border-amber-200 bg-amber-50')}>
            <span className={cn('font-medium', isUser ? 'text-white/80' : 'text-amber-700')}>AI建议: </span>
            <span className={isUser ? 'text-white' : 'text-amber-800'}>{message.suggestion}</span>
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
  const { session, addMessage, incrementRound, setCustomerEmotion, completePractice } = usePracticeStore();
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

    try {
      // Call the harness-powered practice API
      const response = await api.post('/practices/message', {
        sessionId: session.id,
        message: userMessage.content,
      });

      const data = response.data.data;
      const emotionMap: Record<string, EmotionType> = {
        '共情': 'empathy',
        '感兴趣': 'interest',
        '犹豫': 'hesitate',
        '抗拒': 'resist',
        '敷衍': 'resist',
        '中立': 'interest',
        '满意': 'interest',
      };

      setCustomerEmotion(emotionMap[data.emotion] || 'interest');

      const aiMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.response || '...',
        timestamp: Date.now(),
        emotion: data.emotion,
        roundScore: data.round_score,
        evaluationFeedback: data.evaluation_feedback,
      };
      addMessage(aiMessage);

      if (data.is_complete) {
        completePractice();
      }
    } catch (error) {
      // Fallback error message
      addMessage({
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: '抱歉，AI服务暂时不可用，请稍后再试。',
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestion = () => {
    if (!session || session.messages.length === 0) return;
    const lastAiMessage = [...session.messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAiMessage) return;

    const suggestions = [
      '尝试用提问引导客户，了解真实需求',
      '先肯定客户的顾虑，再提供解决方案',
      '用案例或数据增强说服力',
      '尝试用封闭式问题推动决策',
    ];
    const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];

    addMessage({
      id: `sug-${Date.now()}`,
      role: 'user',
      content: `[AI建议] ${suggestion}`,
      timestamp: Date.now(),
      suggestion,
    });
  };

  const handleEnd = () => {
    completePractice();
    onEnd();
  };

  if (!session) return null;

  const isMaxRounds = session.round >= session.maxRounds;

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
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleSuggestion} disabled={isLoading}>
            <Lightbulb className="mr-1 h-3.5 w-3.5" />
            帮我想下一句
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
      {showPsychology && (
        <div className="border-b border-gray-200 bg-amber-50 px-4 py-3">
          <h4 className="text-sm font-medium text-amber-800">客户心理分析</h4>
          <p className="mt-1 text-sm text-amber-700">
            客户当前情绪: {session.customerEmotion === 'interest' ? '对产品感兴趣，有进一步了解意愿' : ''}
            {session.customerEmotion === 'hesitate' ? '存在顾虑，需要更多信心支持' : ''}
            {session.customerEmotion === 'resist' ? '防御心理较强，需要先建立信任' : ''}
            {session.customerEmotion === 'empathy' ? '情感上产生共鸣，但仍有历史阴影' : ''}
          </p>
        </div>
      )}

      {showBenchmark && (
        <div className="border-b border-gray-200 bg-blue-50 px-4 py-3">
          <h4 className="text-sm font-medium text-blue-800">行业最佳话术参考</h4>
          <ul className="mt-1 space-y-1 text-sm text-blue-700">
            <li>• "我理解您的顾虑，很多客户一开始也有类似想法..."</li>
            <li>• "我们可以先从一个小范围尝试，降低您的风险..."</li>
            <li>• "相比竞品，我们的核心优势在于..."</li>
          </ul>
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
          <div className="mb-4 flex justify-start">
            <div className="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm">
              AI客
            </div>
            <div className="flex items-center rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-gray-400" />
              <span className="text-sm text-gray-400">客户正在思考...</span>
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
