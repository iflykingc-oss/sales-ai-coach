import { memo } from 'react';
import { Target } from 'lucide-react';

interface BuyerPersona {
  targetStakeholder?: string;
  hiddenDriver?: string;
}

export const BuyerPersonaCard = memo(function BuyerPersonaCard({ data }: { data?: BuyerPersona }) {
  if (!data) return null;
  return (
    <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-purple-700">
        <Target className="h-4 w-4" />买家画像分析
      </h4>
      <div className="space-y-2">
        {data.targetStakeholder && (
          <div><p className="text-xs font-medium text-purple-500">目标角色</p><p className="text-sm text-purple-800">{data.targetStakeholder}</p></div>
        )}
        {data.hiddenDriver && (
          <div><p className="text-xs font-medium text-purple-500">隐藏动机</p><p className="text-sm text-purple-800">{data.hiddenDriver}</p></div>
        )}
      </div>
    </div>
  );
});
