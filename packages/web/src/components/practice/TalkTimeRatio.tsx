import { cn } from '@/utils/cn';

interface TalkTimeRatioProps {
  userCharCount: number;
  assistantCharCount: number;
  className?: string;
}

export function TalkTimeRatio({ userCharCount, assistantCharCount, className }: TalkTimeRatioProps) {
  const total = userCharCount + assistantCharCount;
  if (total === 0) return null;

  const userPercent = Math.round((userCharCount / total) * 100);
  const assistantPercent = 100 - userPercent;

  // Ideal ratio: 40-45% user (sales rep)
  const isIdeal = userPercent >= 35 && userPercent <= 50;
  const isTooMuch = userPercent > 55;
  const isTooLittle = userPercent < 30;

  const getStatusColor = () => {
    if (isIdeal) return 'text-green-600';
    if (isTooMuch || isTooLittle) return 'text-amber-600';
    return 'text-gray-600';
  };

  const getBarColor = () => {
    if (isIdeal) return 'bg-green-500';
    if (isTooMuch) return 'bg-amber-500';
    if (isTooLittle) return 'bg-blue-500';
    return 'bg-primary-500';
  };

  const getStatusText = () => {
    if (isIdeal) return '✓ 理想比例';
    if (isTooMuch) return '⚠ 你说得太多';
    if (isTooLittle) return '⚠ 你说得太少';
    return '';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex h-2 w-24 overflow-hidden rounded-full bg-gray-200">
        <div
          className={cn('h-full transition-all duration-300', getBarColor())}
          style={{ width: `${userPercent}%` }}
        />
      </div>
      <span className={cn('text-xs font-medium', getStatusColor())}>
        {userPercent}% 你 / {assistantPercent}% 客户
      </span>
      {getStatusText() && (
        <span className={cn('text-xs', getStatusColor())}>
          {getStatusText()}
        </span>
      )}
    </div>
  );
}
