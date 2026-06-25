import { memo } from 'react';
import { Network, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FrameworkAnalysis {
  detectedFrameworks?: string[];
  frameworkUsageQuality?: number;
  stageProgression?: string;
  frameworkStrengths?: string[];
  frameworkGaps?: string[];
  suggestedFrameworks?: string[];
}

export const FrameworkCard = memo(function FrameworkCard({ analysis }: { analysis?: FrameworkAnalysis }) {
  if (!analysis) return null;
  return (
    <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 p-4">
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-violet-700"><Network className="h-4 w-4" />框架分析</h4>
      <div className="space-y-3">
        {analysis.detectedFrameworks?.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-violet-600">识别到的框架</p>
            <div className="flex flex-wrap gap-1.5">{analysis.detectedFrameworks.map((fw, i) => <span key={i} className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-300">{fw}</span>)}</div>
          </div>
        )}
        {typeof analysis.frameworkUsageQuality === 'number' && (
          <div>
            <div className="flex items-center justify-between text-xs text-violet-600"><span>框架运用质量</span><span className="font-medium">{analysis.frameworkUsageQuality}/100</span></div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-violet-100"><div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${analysis.frameworkUsageQuality}%` }} /></div>
          </div>
        )}
        {analysis.stageProgression && <div><p className="text-xs font-medium text-violet-600">阶段推进</p><p className="mt-0.5 text-sm text-violet-800">{analysis.stageProgression}</p></div>}
        {analysis.frameworkStrengths?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-violet-600">框架运用亮点</p>
            <ul className="mt-1 space-y-1">{analysis.frameworkStrengths.map((s, i) => <li key={i} className="flex items-start gap-2 text-sm text-violet-800"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />{s}</li>)}</ul>
          </div>
        )}
        {analysis.frameworkGaps?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-violet-600">框架运用不足</p>
            <ul className="mt-1 space-y-1">{analysis.frameworkGaps.map((g, i) => <li key={i} className="flex items-start gap-2 text-sm text-violet-800"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />{g}</li>)}</ul>
          </div>
        )}
        {analysis.suggestedFrameworks?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-violet-600">建议使用的框架</p>
            <div className="mt-1 flex flex-wrap gap-1.5">{analysis.suggestedFrameworks.map((fw, i) => <span key={i} className="rounded-full bg-violet-100/60 px-2.5 py-0.5 text-xs text-violet-600">{fw}</span>)}</div>
          </div>
        )}
      </div>
    </div>
  );
});
