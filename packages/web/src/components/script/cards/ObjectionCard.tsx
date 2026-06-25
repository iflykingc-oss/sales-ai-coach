import { memo } from 'react';
import { Shield } from 'lucide-react';

interface Objection { likely_objection: string; response: string; principle: string; }

export const ObjectionCard = memo(function ObjectionCard({ data }: { data?: Objection[] }) {
  if (!data?.length) return null;
  return (
    <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-orange-700"><Shield className="h-4 w-4" />异议应对预案</h4>
      <div className="space-y-3">
        {data.map((obj, i) => (
          <div key={i} className="rounded-lg bg-white/60 p-3">
            <p className="text-xs font-medium text-orange-500">客户可能说</p>
            <p className="mt-0.5 text-sm font-medium text-orange-800">"{obj.likely_objection}"</p>
            <p className="mt-2 text-xs font-medium text-orange-500">应对话术</p>
            <p className="mt-0.5 text-sm text-orange-800">{obj.response}</p>
            <p className="mt-2 text-xs text-orange-400 italic">原则: {obj.principle}</p>
          </div>
        ))}
      </div>
    </div>
  );
});
