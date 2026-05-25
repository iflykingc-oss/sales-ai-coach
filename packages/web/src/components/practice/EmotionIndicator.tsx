import { cn } from '@/utils/cn';
import type { EmotionType } from '@/stores/practiceStore';

const emotionConfig: Record<EmotionType, { emoji: string; label: string; color: string; bgColor: string }> = {
  interest: { emoji: '😊', label: '兴趣', color: 'text-green-700', bgColor: 'bg-green-100' },
  hesitate: { emoji: '😐', label: '犹豫', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  resist: { emoji: '😤', label: '抗拒', color: 'text-red-700', bgColor: 'bg-red-100' },
  empathy: { emoji: '🤗', label: '共情', color: 'text-blue-700', bgColor: 'bg-blue-100' },
};

interface EmotionIndicatorProps {
  emotion: EmotionType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function EmotionIndicator({ emotion, size = 'md', showLabel = true, className }: EmotionIndicatorProps) {
  const config = emotionConfig[emotion];
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn('flex items-center justify-center rounded-full', sizes[size])}>
        {config.emoji}
      </span>
      {showLabel && (
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', config.bgColor, config.color)}>
          {config.label}
        </span>
      )}
    </div>
  );
}
