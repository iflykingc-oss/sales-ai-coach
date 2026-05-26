import { cn } from '@/utils/cn';

interface RoundScoresProps {
  scores: Array<{ round: number; score: number }>;
}

export default function RoundScores({ scores }: RoundScoresProps) {
  if (scores.length === 0) return null;
  const maxScore = Math.max(...scores.map((s) => s.score), 100);

  return (
    <div>
      <h4 className="mb-3 text-sm font-medium text-gray-700">逐轮得分</h4>
      <div className="flex items-end gap-2">
        {scores.map((s) => {
          const heightPercent = (s.score / maxScore) * 100;
          const barColor =
            s.score >= 80
              ? 'bg-green-500'
              : s.score >= 60
                ? 'bg-blue-500'
                : s.score >= 40
                  ? 'bg-amber-500'
                  : 'bg-red-500';
          return (
            <div key={s.round} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-gray-500">{s.score}</span>
              <div className="h-20 w-8 rounded bg-gray-100">
                <div
                  className={cn('w-full rounded transition-all', barColor)}
                  style={{ height: `${heightPercent}%`, marginTop: `${100 - heightPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400">R{s.round}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
