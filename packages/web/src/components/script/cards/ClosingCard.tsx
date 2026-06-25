import { memo } from 'react';
import { CheckCircle } from 'lucide-react';

interface Closing { signal: string; method: string; script: string; }

export const ClosingCard = memo(function ClosingCard({ data }: { data?: Closing }) {
  if (!data) return null;
  return (
    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-emerald-700"><CheckCircle className="h-4 w-4" />促成成交策略</h4>
      <div className="space-y-2">
        <div><p className="text-xs font-medium text-emerald-500">成交信号</p><p className="mt-0.5 text-sm text-emerald-800">{data.signal}</p></div>
        <div><p className="text-xs font-medium text-emerald-500">推荐方法</p><p className="mt-0.5 text-sm text-emerald-800">{data.method}</p></div>
        <div className="rounded-lg bg-white/60 p-3"><p className="text-xs font-medium text-emerald-500">促成话术</p><p className="mt-0.5 text-sm font-medium text-emerald-800">{data.script}</p></div>
      </div>
    </div>
  );
});
