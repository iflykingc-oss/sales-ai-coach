import { memo } from 'react';
import { Shield } from 'lucide-react';

interface MultiStage {
  expectedPushback?: string;
  counterStrategy?: string;
  nextProgressiveMove?: string;
}

export const MultiStageCard = memo(function MultiStageCard({ data }: { data?: MultiStage }) {
  if (!data) return null;
  return (
    <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-orange-700"><Shield className="h-4 w-4" />博弈推演</h4>
      <div className="space-y-3">
        {data.expectedPushback && <div className="rounded-lg bg-white/60 p-3"><p className="text-xs font-medium text-orange-500">客户可能反弹</p><p className="text-sm text-orange-800">{data.expectedPushback}</p></div>}
        {data.counterStrategy && <div className="rounded-lg bg-white/60 p-3"><p className="text-xs font-medium text-orange-500">二次反击策略</p><p className="text-sm text-orange-800">{data.counterStrategy}</p></div>}
        {data.nextProgressiveMove && <div className="rounded-lg bg-white/60 p-3"><p className="text-xs font-medium text-orange-500">下一步推进</p><p className="text-sm text-orange-800">{data.nextProgressiveMove}</p></div>}
      </div>
    </div>
  );
});
