import { memo } from 'react';
import { Target } from 'lucide-react';

interface PainAnalysis {
  likely_pains?: string[];
  hidden_needs?: string[];
  decision_factors?: string[];
}

export const PainAnalysisCard = memo(function PainAnalysisCard({ data }: { data?: PainAnalysis }) {
  if (!data) return null;
  return (
    <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4">
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-rose-700"><Target className="h-4 w-4" />客户痛点分析</h4>
      <div className="space-y-3">
        {data.likely_pains?.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-rose-600">可能的核心痛点</p>
            <ul className="space-y-1">{data.likely_pains.map((p, i) => <li key={i} className="flex items-start gap-2 text-sm text-rose-800"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />{p}</li>)}</ul>
          </div>
        )}
        {data.hidden_needs?.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-rose-600">隐藏需求</p>
            <ul className="space-y-1">{data.hidden_needs.map((n, i) => <li key={i} className="flex items-start gap-2 text-sm text-rose-800"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-300" />{n}</li>)}</ul>
          </div>
        )}
        {data.decision_factors?.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-rose-600">决策关键因素</p>
            <div className="flex flex-wrap gap-1.5">{data.decision_factors.map((f, i) => <span key={i} className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs text-rose-700">{f}</span>)}</div>
          </div>
        )}
      </div>
    </div>
  );
});
