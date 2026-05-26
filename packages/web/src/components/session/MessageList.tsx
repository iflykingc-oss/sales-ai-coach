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
      // fallback
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
    <div className={cn('flex w-full group', isUser ? 'justify-end' : 'justify-start')}>
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

export default function MessageList() {
  const { activeSessionId } = useSessionStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const onSendRef = useRef<((input: string, type: InputType) => void) | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load messages when active session changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      // Try cache first
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
          setMessages(json.data.messages);
          await localDb.cacheSession(activeSessionId, {
            ...json.data,
            messages: json.data.messages,
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

  // Expose a method to append messages from outside
  useEffect(() => {
    const handleAppendMessage = (e: CustomEvent) => {
      const msg = e.detail as Message;
      setMessages((prev) => [...prev, msg]);
      // Update cache
      if (activeSessionId) {
        localDb.cacheSession(activeSessionId, {
          messages: [...messages, msg],
        });
      }
    };
    window.addEventListener('append-message', handleAppendMessage as EventListener);
    return () =>
      window.removeEventListener('append-message', handleAppendMessage as EventListener);
  }, [activeSessionId, messages]);

  // Listen for onSend callback from parent (SessionPage)
  useEffect(() => {
    const handleSetOnSend = (e: CustomEvent) => {
      onSendRef.current = e.detail;
    };
    window.addEventListener('set-onsend', handleSetOnSend as EventListener);
    return () => window.removeEventListener('set-onsend', handleSetOnSend as EventListener);
  }, []);

  const handleQuickPrompt = useCallback((prompt: string) => {
    if (onSendRef.current) {
      onSendRef.current(prompt, 'TEXT');
    }
  }, []);

  if (!activeSessionId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-gray-400">
        <MessageCircle className="h-12 w-12" />
        <p className="text-lg font-medium">欢迎使用销冠AI教练</p>
        <p className="text-sm">选择一个会话或创建新会话开始</p>
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
      <div className="flex h-full flex-col items-center justify-center gap-2 text-red-500">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-primary-600 hover:underline"
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
