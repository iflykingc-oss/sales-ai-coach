import { cn } from '@/utils/cn';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RoundScoresProps {
  scores: Array<{ round: number; score: number }>;
}

export default function RoundScores({ scores }: RoundScoresProps) {
  if (scores.length === 0) return null;

  const maxScore = Math.max(...scores.map((s) => s.score), 100);
  const avgScore = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);
  const lastScore = scores[scores.length - 1].score;
  const firstScore = scores[0].score;
  const improvement = lastScore - firstScore;

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bar: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50' };
    if (score >= 60) return { bar: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' };
    if (score >= 40) return { bar: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' };
    return { bar: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' };
  };

  const getTrendIcon = () => {
    if (improvement > 5) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (improvement < -5) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">逐轮得分</h4>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">平均 {avgScore}分</span>
          {getTrendIcon()}
          <span className={cn(
            'font-medium',
            improvement > 0 ? 'text-green-600' : improvement < 0 ? 'text-red-600' : 'text-gray-600'
          )}>
            {improvement > 0 ? '+' : ''}{improvement}分
          </span>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1.5">
        {scores.map((s) => {
          const heightPercent = (s.score / maxScore) * 100;
          const color = getScoreColor(s.score);
          return (
            <div key={s.round} className="group flex flex-1 flex-col items-center gap-1">
              {/* Score label */}
              <span className={cn('text-[10px] font-bold', color.text)}>
                {s.score}
              </span>

              {/* Bar */}
              <div className="relative h-24 w-full rounded bg-gray-100">
                <div
                  className={cn(
                    'absolute bottom-0 w-full rounded transition-all duration-500',
                    color.bar
                  )}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>

              {/* Round label */}
              <span className="text-[10px] text-gray-400">R{s.round}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded bg-green-500" />
          <span className="text-gray-500">优秀 (80+)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded bg-blue-500" />
          <span className="text-gray-500">良好 (60-79)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded bg-amber-500" />
          <span className="text-gray-500">一般 (40-59)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded bg-red-500" />
          <span className="text-gray-500">待改进 (&lt;40)</span>
        </div>
      </div>
    </div>
  );
}
