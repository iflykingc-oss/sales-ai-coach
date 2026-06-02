import { cn } from '@/utils/cn';

const EMOTION_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string; borderColor: string }> = {
  '感兴趣': { emoji: '😊', label: '感兴趣', color: 'text-green-700', bg: 'bg-green-50', borderColor: 'border-green-200' },
  '共情': { emoji: '🤝', label: '共情', color: 'text-blue-700', bg: 'bg-blue-50', borderColor: 'border-blue-200' },
  '犹豫': { emoji: '🤔', label: '犹豫', color: 'text-amber-700', bg: 'bg-amber-50', borderColor: 'border-amber-200' },
  '抗拒': { emoji: '😠', label: '抗拒', color: 'text-red-700', bg: 'bg-red-50', borderColor: 'border-red-200' },
  '敷衍': { emoji: '😐', label: '敷衍', color: 'text-gray-700', bg: 'bg-gray-50', borderColor: 'border-gray-200' },
  '中立': { emoji: '😐', label: '中立', color: 'text-gray-700', bg: 'bg-gray-50', borderColor: 'border-gray-200' },
  '满意': { emoji: '😄', label: '满意', color: 'text-green-700', bg: 'bg-green-50', borderColor: 'border-green-200' },
  '生气': { emoji: '😡', label: '生气', color: 'text-red-700', bg: 'bg-red-50', borderColor: 'border-red-200' },
};

interface EmotionTimelineProps {
  emotions: Array<{ round: number; emotion: string }>;
}

export default function EmotionTimeline({ emotions }: EmotionTimelineProps) {
  if (emotions.length === 0) return null;

  // Calculate emotion trend
  const getEmotionScore = (emotion: string): number => {
    const scores: Record<string, number> = {
      '生气': 1, '抗拒': 2, '敷衍': 3, '中立': 4, '犹豫': 5, '感兴趣': 6, '共情': 7, '满意': 8,
    };
    return scores[emotion] || 4;
  };

  const lastEmotion = emotions[emotions.length - 1];
  const prevEmotion = emotions.length > 1 ? emotions[emotions.length - 2] : null;
  const trend = prevEmotion
    ? getEmotionScore(lastEmotion.emotion) - getEmotionScore(prevEmotion.emotion)
    : 0;

  const trendText = trend > 0 ? '情绪上升 ↑' : trend < 0 ? '情绪下降 ↓' : '情绪平稳 →';
  const trendColor = trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600';

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">客户情绪变化</h4>
        <span className={cn('text-xs font-medium', trendColor)}>{trendText}</span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Connection line */}
        <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200" />

        {/* Emotion items */}
        <div className="relative space-y-3">
          {emotions.map((e, idx) => {
            const config = EMOTION_CONFIG[e.emotion] || {
              emoji: '❓',
              label: e.emotion,
              color: 'text-gray-700',
              bg: 'bg-gray-50',
              borderColor: 'border-gray-200',
            };
            const isLast = idx === emotions.length - 1;

            return (
              <div key={idx} className="flex items-start gap-3">
                {/* Emotion dot */}
                <div
                  className={cn(
                    'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2',
                    config.bg,
                    config.borderColor,
                    isLast && 'ring-2 ring-primary-200'
                  )}
                >
                  <span className="text-sm">{config.emoji}</span>
                </div>

                {/* Content */}
                <div
                  className={cn(
                    'flex-1 rounded-lg border p-2.5',
                    config.bg,
                    config.borderColor,
                    isLast && 'border-primary-200 bg-primary-50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn('text-xs font-medium', config.color)}>
                      {config.label}
                    </span>
                    <span className="text-[10px] text-gray-500">第{e.round}轮</span>
                  </div>
                  {isLast && emotions.length > 1 && (
                    <div className="mt-1 text-[10px] text-gray-500">
                      {trend > 0 && '客户态度有所改善，继续保持'}
                      {trend < 0 && '客户情绪下降，需要调整策略'}
                      {trend === 0 && '客户情绪稳定'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 rounded-lg bg-gray-50 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">情绪轨迹</span>
          <span className="font-medium text-gray-700">
            {emotions.map((e) => e.emotion).join(' → ')}
          </span>
        </div>
      </div>
    </div>
  );
}
