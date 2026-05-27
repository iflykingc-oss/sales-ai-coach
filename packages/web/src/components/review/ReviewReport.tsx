import { useState } from 'react';
import { CheckCircle, Calendar, Target, Wrench, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { RadarChart } from '@/components/ui/RadarChart';
import type { RadarDimension } from '@/components/ui/RadarChart';
import type { ReviewReport } from '@/stores/reviewStore';
import { cn } from '@/utils/cn';
import { EVALUATION_DIMENSIONS } from '@sales-ai-coach/shared';

const defaultDimensions: string[] = [...EVALUATION_DIMENSIONS];

interface ReviewReportDisplayProps {
  report: ReviewReport;
}

export function ReviewReportDisplay({ report }: ReviewReportDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  const radarDimensions: RadarDimension[] = defaultDimensions.map((label) => ({
    label,
    score: report.radarScores[label] ?? 0,
  }));

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="border-l-4 border-l-primary-500">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">{report.date}</span>
              {report.scenarioType && (
                <Badge variant="info">{report.scenarioType}</Badge>
              )}
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div className={cn('text-4xl font-bold', getScoreColor(report.overallScore))}>
                {report.overallScore}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">综合评分</div>
                <div className="text-xs text-gray-500">满分 100</div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">{report.summary}</p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <RadarChart dimensions={radarDimensions} size={180} />
          </div>
        </div>
      </Card>

      {/* Radar Chart (expanded) */}
      {expanded && (
        <Card>
          <h4 className="mb-3 text-sm font-medium text-gray-700">能力维度详情</h4>
          <div className="flex justify-center">
            <RadarChart dimensions={radarDimensions} size={300} />
          </div>
        </Card>
      )}

      {/* Strengths */}
      <Card className="border-l-4 border-l-green-500">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-green-700">
          <CheckCircle className="h-4 w-4" />
          今日亮点
        </h4>
        <ul className="space-y-2">
          {report.strengths.map((item: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-0.5 text-green-500">&#10004;</span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      {/* Improvements */}
      <Card className="border-l-4 border-l-amber-500">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-700">
          <Wrench className="h-4 w-4" />
          需要改进
        </h4>
        <ul className="space-y-2">
          {report.improvements.map((item: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-0.5 text-amber-500">&#128295;</span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      {/* Action Items */}
      <Card className="border-l-4 border-l-blue-500">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-700">
          <Target className="h-4 w-4" />
          明日行动计划
        </h4>
        <ul className="space-y-2">
          {report.actionItems.map((item: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-0.5 text-blue-500">{i + 1}.</span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      {/* Per-dimension score bars */}
      <Card>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
          <TrendingUp className="h-4 w-4" />
          各维度得分
        </h4>
        <div className="space-y-2.5">
          {radarDimensions
            .sort((a, b) => b.score - a.score)
            .map((dim) => (
              <div key={dim.label} className="flex items-center gap-3">
                <span className="w-20 text-xs text-gray-500 truncate">{dim.label}</span>
                <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      dim.score >= 80 ? 'bg-green-500' : dim.score >= 60 ? 'bg-blue-500' : dim.score >= 40 ? 'bg-amber-500' : 'bg-red-500',
                    )}
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
                <span className={cn('w-8 text-right text-xs font-semibold', getScoreColor(dim.score))}>
                  {dim.score}
                </span>
              </div>
            ))}
        </div>
      </Card>

      {/* Toggle full radar */}
      <div className="flex justify-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>收起详情 <ChevronUp className="ml-1 h-3 w-3" /></>
          ) : (
            <>展开雷达图 <ChevronDown className="ml-1 h-3 w-3" /></>
          )}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.location.href = '/app/practice'}
        >
          <Target className="mr-1 h-3 w-3" />
          针对弱项练习
        </Button>
      </div>
    </div>
  );
}
