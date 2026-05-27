import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';

interface LevelProgressProps {
  currentLevel: {
    level: number;
    name: string;
    xpRequired: number;
    icon: string;
  };
  nextLevel: {
    level: number;
    name: string;
    xpRequired: number;
    icon: string;
  } | null;
  totalXp: number;
  xpForNextLevel: number;
  className?: string;
}

export function LevelProgress({ currentLevel, nextLevel, totalXp, xpForNextLevel, className }: LevelProgressProps) {
  const progressPercent = nextLevel
    ? ((totalXp - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired)) * 100
    : 100;

  return (
    <Card className={cn('', className)}>
      <div className="flex items-center gap-4">
        {/* Level icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-100 to-yellow-200 shadow-inner">
          <span className="text-3xl">{currentLevel.icon}</span>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">Lv.{currentLevel.level}</h3>
            <span className="text-sm font-medium text-gray-700">{currentLevel.name}</span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            总经验值: <span className="font-semibold text-yellow-600">{totalXp} XP</span>
          </p>
        </div>

        {nextLevel && (
          <div className="text-right">
            <p className="text-xs text-gray-500">下一级</p>
            <p className="text-sm font-medium text-gray-700">
              {nextLevel.icon} {nextLevel.name}
            </p>
            <p className="text-xs text-yellow-600">还需 {xpForNextLevel} XP</p>
          </div>
        )}
      </div>

      {/* XP bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Lv.{currentLevel.level}</span>
          {nextLevel && <span>Lv.{nextLevel.level}</span>}
        </div>
        <div className="mt-1 h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 transition-all duration-700 ease-out"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
          <span>{currentLevel.xpRequired} XP</span>
          {nextLevel && <span>{nextLevel.xpRequired} XP</span>}
        </div>
      </div>
    </Card>
  );
}
