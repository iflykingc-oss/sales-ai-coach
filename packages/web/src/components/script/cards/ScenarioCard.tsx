import { memo } from 'react';
import { TrendingUp } from 'lucide-react';

interface Scenario {
  stage?: string;
  objective?: string;
  next_step?: string;
}

export const ScenarioCard = memo(function ScenarioCard({ data }: { data?: Scenario }) {
  if (!data) return null;
  return (
    <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-indigo-700"><TrendingUp className="h-4 w-4" />场景拆解</h4>
      <div className="grid gap-3 sm:grid-cols-3">
        {data.stage && <div className="rounded-lg bg-white/60 p-3"><p className="text-xs font-medium text-indigo-500">当前阶段</p><p className="mt-1 text-sm font-semibold text-indigo-800">{data.stage}</p></div>}
        {data.objective && <div className="rounded-lg bg-white/60 p-3"><p className="text-xs font-medium text-indigo-500">核心目标</p><p className="mt-1 text-sm text-indigo-800">{data.objective}</p></div>}
        {data.next_step && <div className="rounded-lg bg-white/60 p-3"><p className="text-xs font-medium text-indigo-500">下一步行动</p><p className="mt-1 text-sm text-indigo-800">{data.next_step}</p></div>}
      </div>
    </div>
  );
});
