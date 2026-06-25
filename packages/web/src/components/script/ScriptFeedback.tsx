import { logger } from '@/utils/logger';
import { useState, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

interface ScriptFeedbackProps {
  scriptId: string;
  onFeedback?: (scriptId: string, type: 'up' | 'down', reason?: string) => Promise<void>;
  previouslySubmitted?: boolean;
}

export default function ScriptFeedback({
  scriptId,
  onFeedback,
  previouslySubmitted,
}: ScriptFeedbackProps) {
  const [selectedType, setSelectedType] = useState<'up' | 'down' | null>(null);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(previouslySubmitted || false);

  const handleSelect = useCallback(
    async (type: 'up' | 'down') => {
      if (submitted || isSubmitting) return;

      if (type === 'up') {
        setSelectedType('up');
        setIsSubmitting(true);
        try {
          if (onFeedback) {
            await onFeedback(scriptId, 'up');
          } else {
            await submitFeedbackToApi(scriptId, 'up');
          }
          setSubmitted(true);
        } catch (err) {
          logger.error('Feedback error:', err);
          setSelectedType(null);
        } finally {
          setIsSubmitting(false);
        }
      } else {
        // Thumbs down - ask for reason
        setSelectedType('down');
        setShowReason(true);
      }
    },
    [submitted, isSubmitting, scriptId, onFeedback],
  );

  const handleSubmitReason = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (onFeedback) {
        await onFeedback(scriptId, 'down', reason.trim() || undefined);
      } else {
        await submitFeedbackToApi(scriptId, 'down', reason.trim() || undefined);
      }
      setSubmitted(true);
      setShowReason(false);
    } catch (err) {
      logger.error('Feedback error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, scriptId, reason, onFeedback]);

  const submitFeedbackToApi = async (
    id: string,
    type: 'up' | 'down',
    reasonText?: string,
  ) => {
    const res = await fetch(`/api/scripts/${id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ type, reason: reasonText }),
    });
    if (!res.ok) throw new Error('Failed to submit feedback');
    return res.json();
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {selectedType === 'up' ? (
          <>
            <ThumbsUp className="h-4 w-4 text-green-500" />
            <span>感谢反馈！</span>
          </>
        ) : (
          <>
            <ThumbsDown className="h-4 w-4 text-red-500" />
            <span>已收到反馈，我们会持续改进</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500">这条话术有帮助吗？</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleSelect('up')}
          disabled={isSubmitting}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors',
            selectedType === 'up'
              ? 'border-green-300 bg-green-50 text-green-600'
              : 'border-gray-200 text-gray-500 hover:border-green-200 hover:bg-green-50 hover:text-green-600',
          )}
        >
          <ThumbsUp className="h-4 w-4" />
          有帮助
        </button>
        <button
          onClick={() => handleSelect('down')}
          disabled={isSubmitting}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors',
            selectedType === 'down' && !showReason
              ? 'border-red-300 bg-red-50 text-red-600'
              : 'border-gray-200 text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600',
          )}
        >
          <ThumbsDown className="h-4 w-4" />
          没帮助
        </button>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </div>

      {showReason && (
        <div className="space-y-2 pt-1">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="请告诉我们哪里不满意（选填）：语气不合适？内容不实用？缺少针对性？"
            rows={2}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmitReason} disabled={isSubmitting}>
              {isSubmitting ? '提交中...' : '提交反馈'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowReason(false);
                setSelectedType(null);
              }}
            >
              取消
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
