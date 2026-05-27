import { useMemo } from 'react';
import { Trophy, Target, Flame, Star, Award } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { AchievementBadge } from './AchievementBadge';
import type { Achievement } from '@sales-ai-coach/shared';

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  practice: { label: '练习成就', icon: <Trophy className="h-4 w-4" /> },
  skill: { label: '技能成就', icon: <Target className="h-4 w-4" /> },
  streak: { label: '连续打卡', icon: <Flame className="h-4 w-4" /> },
  milestone: { label: '里程碑', icon: <Star className="h-4 w-4" /> },
  social: { label: '社交成就', icon: <Award className="h-4 w-4" /> },
};

interface AchievementGridProps {
  achievements: Array<Achievement & { unlocked: boolean }>;
  className?: string;
}

export function AchievementGrid({ achievements, className }: AchievementGridProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, Array<Achievement & { unlocked: boolean }>> = {};
    for (const a of achievements) {
      if (!groups[a.category]) groups[a.category] = [];
      groups[a.category].push(a);
    }
    return groups;
  }, [achievements]);

  const totalUnlocked = achievements.filter((a) => a.unlocked).length;
  const totalXp = achievements.filter((a) => a.unlocked).reduce((sum, a) => sum + a.xp, 0);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">成就总览</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              已解锁 {totalUnlocked} / {achievements.length} 个成就
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-yellow-600">{totalXp} XP</p>
            <p className="text-xs text-gray-500">已获得经验值</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-500"
            style={{ width: `${achievements.length > 0 ? (totalUnlocked / achievements.length) * 100 : 0}%` }}
          />
        </div>
      </Card>

      {/* Category groups */}
      {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
        const items = grouped[category];
        if (!items || items.length === 0) return null;
        const unlockedCount = items.filter((a) => a.unlocked).length;

        return (
          <Card key={category}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                {config.icon}
                {config.label}
              </div>
              <span className="text-xs text-gray-500">
                {unlockedCount}/{items.length}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {items.map((achievement) => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  unlocked={achievement.unlocked}
                />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
