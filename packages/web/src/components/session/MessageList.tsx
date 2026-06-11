import { useEffect, useRef, useCallback, useState } from 'react';
import { MessageCircle, Image, Mic, FileText, Clipboard, Loader2, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/utils/cn';
import { useSessionStore } from '@/stores/sessionStore';
import { localDb } from '@/lib/db';
import type { InputType, MessageRole } from '@sales-ai-coach/shared';

interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  inputType: InputType;
  createdAt: string;
}

const INPUT_TYPE_ICONS: Record<InputType, React.ReactNode> = {
  TEXT: <MessageCircle className="h-3.5 w-3.5" />,
  IMAGE: <Image className="h-3.5 w-3.5" />,
  VOICE: <Mic className="h-3.5 w-3.5" />,
  FORM: <FileText className="h-3.5 w-3.5" />,
  PASTE: <Clipboard className="h-3.5 w-3.5" />,
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

const QUICK_PROMPTS = [
  { icon: <MessageCircle className="h-4 w-4" />, label: '初次接触', prompt: '客户第一次来咨询，我该如何开场？' },
  { icon: <FileText className="h-4 w-4" />, label: '价格异议', prompt: '客户说"太贵了"，怎么回应？' },
  { icon: <Image className="h-4 w-4" />, label: '竞品对比', prompt: '客户在对比竞品，如何突出我们的优势？' },
  { icon: <Mic className="h-4 w-4" />, label: '促成关单', prompt: '聊得不错，怎么自然推动成交？' },
];

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'USER';
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = message.content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [message.content]);

  return (
    <div className={cn('flex w-full group animate-in fade-in slide-in-from-bottom-2 duration-300', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed relative',
          isUser
            ? 'bg-primary-600 text-white rounded-br-sm'
            : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm',
        )}
      >
        {message.inputType !== 'TEXT' && (
          <div
            className={cn(
              'mb-1 flex items-center gap-1.5 text-xs',
              isUser ? 'text-primary-200' : 'text-gray-400',
            )}
          >
            {INPUT_TYPE_ICONS[message.inputType]}
            <span>{message.inputType}</span>
          </div>
        )}
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2 prose-strong:font-semibold">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        <div className={cn(
          'mt-1.5 flex items-center justify-between gap-2',
          isUser ? 'text-primary-200' : 'text-gray-400',
        )}>
          <span className="text-[11px]">{formatTime(message.createdAt)}</span>
          <button
            onClick={handleCopy}
            className={cn(
              'absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded',
              isUser
                ? 'hover:bg-primary-500 text-primary-200'
                : 'hover:bg-gray-100 text-gray-400',
            )}
            title="复制消息"
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}

interface MessageListProps {
  onSend?: (input: string, inputType: InputType) => void;
  onAppendMessage?: (msg: Message) => void;
}

export default function MessageList({ onSend, onAppendMessage }: MessageListProps) {
  const { activeSessionId } = useSessionStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Expose appendMessage via callback
  useEffect(() => {
    if (onAppendMessage) {
      // Store the callback so parent can call it
      (window as any).__messageListAppend = (msg: Message) => {
        setMessages((prev) => {
          const updated = [...prev, msg];
          if (activeSessionId) {
            localDb.cacheSession(activeSessionId, { messages: updated });
          }
          return updated;
        });
      };
    }
    return () => {
      delete (window as any).__messageListAppend;
    };
  }, [onAppendMessage, activeSessionId]);

  // Load messages when active session changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      const cached = await localDb.getCachedSession(activeSessionId);
      if (cached?.messages && !cancelled) {
        setMessages(cached.messages);
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/sessions/${activeSessionId}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to load session');
        const json = await res.json();
        if (!cancelled && json.success && json.data?.messages) {
          const serverMessages = json.data.messages as Message[];
          setMessages((prev) => {
            const optimisticOnly = prev.filter(
              (m) => m.id.startsWith('opt-') && !serverMessages.some(
                (s) => s.role === m.role && s.content === m.content && Math.abs(new Date(s.createdAt).getTime() - new Date(m.createdAt).getTime()) < 5000,
              ),
            );
            const merged = [...optimisticOnly, ...serverMessages];
            return merged;
          });
          await localDb.cacheSession(activeSessionId, {
            ...json.data,
            messages: serverMessages,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '加载失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [activeSessionId]);

  const handleQuickPrompt = useCallback((prompt: string) => {
    if (onSend) {
      onSend(prompt, 'TEXT');
    }
  }, [onSend]);

  if (!activeSessionId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-500">
          <MessageCircle className="h-8 w-8" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">欢迎使用销冠AI教练</p>
          <p className="mt-1 text-sm text-gray-500">选择左侧会话，或试试这些场景快速开始</p>
        </div>
        <div className="grid w-full max-w-md gap-2 sm:grid-cols-2">
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp.label}
              onClick={() => handleQuickPrompt(qp.prompt)}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-all hover:border-primary-300 hover:shadow-sm active:scale-[0.98]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                {qp.icon}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{qp.label}</div>
                <div className="text-xs text-gray-500 line-clamp-1">{qp.prompt}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (loading && messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-400">
          <MessageCircle className="h-6 w-6" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">加载失败</p>
          <p className="mt-1 text-xs text-gray-500">{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-4">
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center">
          <MessageCircle className="mb-4 h-10 w-10 text-gray-300" />
          <p className="mb-1 text-sm font-medium text-gray-500">开始一段新对话</p>
          <p className="mb-6 text-xs text-gray-400">描述你的销售场景，AI 帮你出招</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleQuickPrompt(p.prompt)}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition-all hover:border-primary-300 hover:bg-primary-50/30 hover:shadow-sm"
              >
                <span className="text-gray-500">{p.icon}</span>
                <div>
                  <span className="text-xs font-medium text-gray-700">{p.label}</span>
                  <p className="text-[11px] text-gray-400">{p.prompt}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {messages.map((msg) => (
            <div key={msg.id} className="mb-3">
              <MessageBubble message={msg} />
            </div>
          ))}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
