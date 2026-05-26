import { cn } from '@/utils/cn';

const EMOTION_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  '感兴趣': { emoji: '\u{1F60A}', label: '感兴趣', color: 'text-green-700', bg: 'bg-green-100' },
  '共情': { emoji: '\u{1F91D}', label: '共情', color: 'text-blue-700', bg: 'bg-blue-100' },
  '犹豫': { emoji: '\u{1F914}', label: '犹豫', color: 'text-amber-700', bg: 'bg-amber-100' },
  '抗拒': { emoji: '\u{1F620}', label: '抗拒', color: 'text-red-700', bg: 'bg-red-100' },
  '敷衍': { emoji: '\u{1F610}', label: '敷衍', color: 'text-gray-700', bg: 'bg-gray-100' },
  '中立': { emoji: '\u{1F610}', label: '中立', color: 'text-gray-700', bg: 'bg-gray-100' },
  '满意': { emoji: '\u{1F60A}', label: '满意', color: 'text-green-700', bg: 'bg-green-100' },
};

interface EmotionTimelineProps {
  emotions: Array<{ round: number; emotion: string }>;
}

export default function EmotionTimeline({ emotions }: EmotionTimelineProps) {
  if (emotions.length === 0) return null;

  return (
    <div>
      <h4 className="mb-3 text-sm font-medium text-gray-700">客户情绪变化</h4>
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {emotions.map((e, idx) => {
          const config = EMOTION_CONFIG[e.emotion] || { emoji: '\u{2753}', label: e.emotion, color: 'text-gray-700', bg: 'bg-gray-100' };
          return (
            <div key={idx} className="flex items-center gap-1">
              <div
                className={cn('flex flex-col items-center rounded-lg px-3 py-2', config.bg)}
                title={`第${e.round}轮: ${config.label}`}
              >
                <span className="text-lg">{config.emoji}</span>
                <span className={cn('text-[10px] font-medium', config.color)}>第{e.round}轮</span>
              </div>
              {idx < emotions.length - 1 && (
                <div className="h-px w-4 flex-shrink-0 bg-gray-300" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
