import { memo } from 'react';
import { Star } from 'lucide-react';

interface Pitfall { action: string; reason: string; }

export const PitfallsCard = memo(function PitfallsCard({ pitfalls, reasoning }: { pitfalls?: Pitfall[]; reasoning?: string[] }) {
  if (!pitfalls?.length) return null;
  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-amber-700"><Star className="h-4 w-4" />销冠经验</h4>
      <div className="space-y-3">
        {pitfalls.slice(0, 2).map((p, i) => (
          <div key={i} className="rounded-lg bg-white/60 p-3">
            <p className="text-xs font-medium text-amber-500">避免踩坑</p>
            <p className="text-sm text-amber-800 font-medium">❌ {p.action}</p>
            <p className="text-xs text-amber-600 mt-1">{p.reason}</p>
          </div>
        ))}
        {reasoning?.[0] && (
          <div className="rounded-lg bg-white/60 p-3">
            <p className="text-xs font-medium text-amber-500">为什么这样说有效</p>
            <p className="text-sm text-amber-800">{reasoning[0]}</p>
          </div>
        )}
      </div>
    </div>
  );
});
