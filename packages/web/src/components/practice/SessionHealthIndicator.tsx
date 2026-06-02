import { cn } from '@/utils/cn';
import type { EmotionType } from '@/stores/practiceStore';

interface SessionHealthIndicatorProps {
  emotion: EmotionType;
  round: number;
  maxRounds: number;
  roundScores: number[];
  className?: string;
}

const POSITIVE_EMOTIONS: EmotionType[] = ['interest', 'empathy'];
const NEGATIVE_EMOTIONS: EmotionType[] = ['resist', 'hesitate'];

export function SessionHealthIndicator({
  emotion,
  round,
  maxRounds,
  roundScores,
  className,
}: SessionHealthIndicatorProps) {
  // Calculate health score (0-100)
  let healthScore = 50; // Start neutral

  // Emotion factor (40% weight)
  if (POSITIVE_EMOTIONS.includes(emotion)) {
    healthScore += 20;
  } else if (NEGATIVE_EMOTIONS.includes(emotion)) {
    healthScore -= 20;
  }

  // Score trend factor (40% weight)
  if (roundScores.length >= 2) {
    const recentScores = roundScores.slice(-3);
    const avgScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    healthScore += (avgScore - 0.5) * 40; // -20 to +20
  }

  // Progress factor (20% weight)
  const progress = round / maxRounds;
  if (progress > 0.7 && roundScores.length > 0) {
    const lastScore = roundScores[roundScores.length - 1];
    if (lastScore > 0.7) {
      healthScore += 10; // Bonus for strong finish
    }
  }

  // Clamp to 0-100
  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

  // Determine color and label
  const getHealthColor = () => {
    if (healthScore >= 70) return { bg: 'bg-green-500', text: 'text-green-600', label: '良好' };
    if (healthScore >= 40) return { bg: 'bg-amber-500', text: 'text-amber-600', label: '一般' };
    return { bg: 'bg-red-500', text: 'text-red-600', label: '需改善' };
  };

  const health = getHealthColor();

  // Don't show for first round
  if (round < 2) return null;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex items-center gap-1">
        <div className={cn('h-2 w-2 rounded-full', health.bg)} />
        <span className={cn('text-xs font-medium', health.text)}>
          会话{health.label}
        </span>
      </div>
      <span className="text-xs text-gray-400">({healthScore}分)</span>
    </div>
  );
}
