import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  practiceDates?: string[]; // ISO date strings like '2024-01-15'
  className?: string;
}

export function StreakDisplay({ currentStreak, longestStreak, practiceDates = [], className }: StreakDisplayProps) {
  // Build a set of practice dates for quick lookup
  const practiceDateSet = useMemo(() => new Set(practiceDates), [practiceDates]);

  // Generate last 28 days (4 weeks) for the mini calendar heatmap
  const calendarDays = useMemo(() => {
    const days: Array<{ date: string; dayLabel: string; hasPractice: boolean }> = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push({
        date: dateStr,
        dayLabel: d.toLocaleDateString('zh-CN', { weekday: 'narrow' }),
        hasPractice: practiceDateSet.has(dateStr),
      });
    }
    return days;
  }, [practiceDateSet]);

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'text-red-500';
    if (streak >= 14) return 'text-orange-500';
    if (streak >= 7) return 'text-yellow-500';
    if (streak >= 3) return 'text-amber-500';
    return 'text-gray-400';
  };

  const getFlameSize = (streak: number) => {
    if (streak >= 30) return 'h-10 w-10';
    if (streak >= 14) return 'h-8 w-8';
    if (streak >= 7) return 'h-7 w-7';
    return 'h-6 w-6';
  };

  return (
    <Card className={cn('', className)}>
      <div className="flex items-center justify-between">
        {/* Current streak */}
        <div className="flex items-center gap-3">
          <div className={cn('transition-all', getStreakColor(currentStreak))}>
            <Flame className={cn(getFlameSize(currentStreak), currentStreak > 0 && 'animate-pulse')} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{currentStreak}</p>
            <p className="text-xs text-gray-500">天连续打卡</p>
          </div>
        </div>

        {/* Longest streak */}
        <div className="text-right">
          <p className="text-xs text-gray-500">最长连续</p>
          <p className="text-lg font-semibold text-gray-700">{longestStreak} 天</p>
        </div>
      </div>

      {/* Mini calendar heatmap */}
      <div className="mt-4">
        <p className="mb-2 text-xs text-gray-500">近4周练习记录</p>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => (
            <div
              key={day.date}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-medium transition-colors',
                day.hasPractice
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-400',
              )}
              title={day.date}
            >
              {new Date(day.date).getDate()}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-gray-100" />
            <span>未练习</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-green-500" />
            <span>已练习</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
