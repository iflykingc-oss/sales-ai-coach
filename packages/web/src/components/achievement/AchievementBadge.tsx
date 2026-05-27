import { useState } from 'react';
import { cn } from '@/utils/cn';
import type { Achievement } from '@sales-ai-coach/shared';

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  bronze: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-700',
    glow: 'shadow-amber-200/50',
  },
  silver: {
    bg: 'bg-gray-50',
    border: 'border-gray-300',
    text: 'text-gray-700',
    glow: 'shadow-gray-200/50',
  },
  gold: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-400',
    text: 'text-yellow-700',
    glow: 'shadow-yellow-200/50',
  },
  platinum: {
    bg: 'bg-purple-50',
    border: 'border-purple-400',
    text: 'text-purple-700',
    glow: 'shadow-purple-200/50',
  },
};

const TIER_LABELS: Record<string, string> = {
  bronze: '青铜',
  silver: '白银',
  gold: '黄金',
  platinum: '铂金',
};

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
  className?: string;
}

export function AchievementBadge({ achievement, unlocked, className }: AchievementBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const colors = TIER_COLORS[achievement.tier] || TIER_COLORS.bronze;

  return (
    <div
      className={cn('relative inline-block', className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 p-3 transition-all duration-200',
          unlocked
            ? cn(colors.bg, colors.border, 'shadow-md', colors.glow)
            : 'border-gray-200 bg-gray-100 opacity-50 grayscale',
          unlocked && 'hover:scale-105 hover:shadow-lg',
        )}
      >
        <span className={cn('text-3xl', !unlocked && 'grayscale')}>{achievement.icon}</span>
        <span className={cn('mt-1 text-xs font-medium', unlocked ? colors.text : 'text-gray-400')}>
          {achievement.name}
        </span>
        {unlocked && (
          <span className="mt-0.5 text-[10px] font-semibold text-yellow-600">+{achievement.xp} XP</span>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-52 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">{achievement.icon}</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">{achievement.name}</p>
              <p className="text-[10px] font-medium text-gray-500">{TIER_LABELS[achievement.tier]}</p>
            </div>
          </div>
          <p className="mt-1.5 text-xs text-gray-600">{achievement.description}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-medium text-yellow-600">+{achievement.xp} XP</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium',
                unlocked ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
              )}
            >
              {unlocked ? '已解锁' : '未解锁'}
            </span>
          </div>
          {/* Arrow */}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-white" />
        </div>
      )}
    </div>
  );
}
