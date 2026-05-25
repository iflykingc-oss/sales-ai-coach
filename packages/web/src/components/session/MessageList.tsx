import { useEffect, useRef, useCallback, useState } from 'react';
import { MessageCircle, Image, Mic, FileText, Clipboard, Loader2 } from 'lucide-react';
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

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'USER';

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
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
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <div
          className={cn(
            'mt-1.5 text-right text-[11px]',
            isUser ? 'text-primary-200' : 'text-gray-400',
          )}
        >
          {formatTime(message.createdAt)}
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
        <div className="flex flex-1 items-center justify-center text-gray-400">
          <div className="text-center">
            <MessageCircle className="mx-auto mb-2 h-8 w-8" />
            <p className="text-sm">暂无消息，在下方输入开始会话</p>
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
