import { memo } from 'react';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface QualityReport {
  score: number;
  feedback?: string;
  passed: boolean;
}

export const QualityCard = memo(function QualityCard({ data }: { data?: QualityReport }) {
  if (!data) return null;
  return (
    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-blue-700"><CheckCircle className="h-4 w-4" />质量评估报告</h4>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-blue-600">评分: </span>
        <span className="font-medium text-blue-800">{Math.round(data.score * 100)}%</span>
        <span className={cn('rounded-full px-2 py-0.5 text-xs', data.passed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
          {data.passed ? '质量通过' : '质量待改进'}
        </span>
      </div>
      {data.feedback && <p className="mt-2 text-xs text-blue-600">{data.feedback}</p>}
    </div>
  );
});
