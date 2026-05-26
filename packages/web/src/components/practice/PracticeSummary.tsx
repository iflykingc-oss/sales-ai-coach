import { useState, useEffect, useMemo, useCallback } from 'react';
import { Trophy, Wrench, Lightbulb, CheckCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Badge';
import { RadarChart } from '@/components/ui/RadarChart';
import type { RadarDimension } from '@/components/ui/RadarChart';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePracticeStore } from '@/stores/practiceStore';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';
import { EVALUATION_DIMENSIONS } from '@sales-ai-coach/shared';
import EmotionTimeline from './EmotionTimeline';
import RoundScores from './RoundScores';

const defaultDimensions: string[] = [...EVALUATION_DIMENSIONS];

interface PracticeSummaryProps {
  onRestart: () => void;
}

export function PracticeSummary({ onRestart }: PracticeSummaryProps) {
  const { session, summary, setSummary, setIsGeneratingSummary } = usePracticeStore();
  const [loading, setLoading] = useState(true);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);

  const handleDimensionClick = useCallback((dim: RadarDimension) => {
    setSelectedDimension((prev) => (prev === dim.label ? null : dim.label));
  }, []);

  useEffect(() => {
    if (!session || summary) {
      setLoading(false);
      return;
    }

    // Fetch report from the harness-powered API
    const fetchReport = async () => {
      setIsGeneratingSummary(true);
      try {
        const response = await api.post('/practices/report', {
          sessionId: session.id,
        });

        const report = response.data.data;
        if (report && report.radarScores) {
          // Normalize: ensure all expected dimensions present
          const normalizedScores: Record<string, number> = {};
          for (const dim of defaultDimensions) {
            normalizedScores[dim] = report.radarScores[dim] ?? 0;
          }
          setSummary({
            sessionId: session.id,
            totalScore: Math.round(report.overall_score * 100),
            strengths: report.strengths || [],
            improvements: report.weaknesses || [],
            recommendations: report.recommendations?.map((r: any) =>
              `${r.dimension}: ${r.advice}`,
            ) || [],
            radarScores: normalizedScores,
          });
        }
      } catch (error) {
        console.error('Failed to fetch practice report:', error);
      } finally {
        setIsGeneratingSummary(false);
        setLoading(false);
      }
    };

    fetchReport();
  }, [session, summary]);

  const radarDimensions: RadarDimension[] = defaultDimensions.map((label) => ({
    label,
    score: summary?.radarScores[label] ?? 0,
  }));

  const totalScore = summary?.totalScore ?? Math.floor(
    radarDimensions.reduce((sum, d) => sum + d.score, 0) / radarDimensions.length,
  );

  const getScoreGrade = (score: number) => {
    if (score >= 90) return { grade: 'S', color: 'text-amber-500', bg: 'bg-amber-50' };
    if (score >= 80) return { grade: 'A', color: 'text-green-500', bg: 'bg-green-50' };
    if (score >= 70) return { grade: 'B', color: 'text-blue-500', bg: 'bg-blue-50' };
    if (score >= 60) return { grade: 'C', color: 'text-orange-500', bg: 'bg-orange-50' };
    return { grade: 'D', color: 'text-red-500', bg: 'bg-red-50' };
  };

  const gradeInfo = getScoreGrade(totalScore);

  // Extract per-round emotion and score data from session messages
  const roundData = useMemo(() => {
    if (!session) return { emotions: [], scores: [] };
    let round = 0;
    const emotions: Array<{ round: number; emotion: string }> = [];
    const scores: Array<{ round: number; score: number }> = [];
    for (const msg of session.messages) {
      if (msg.role === 'assistant') {
        round++;
        if (msg.emotion) emotions.push({ round, emotion: msg.emotion });
        if (msg.roundScore != null) scores.push({ round, score: msg.roundScore });
      }
    }
    return { emotions, scores };
  }, [session]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton.Card />
        <Skeleton.Card />
        <Skeleton.Card />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score Card */}
      <Card className="text-center">
        <div className="mb-2 inline-flex items-center justify-center rounded-full bg-gray-100 p-3">
          <Trophy className={`h-8 w-8 ${gradeInfo.color}`} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">陪练完成</h3>
        <div className="mt-3 flex items-center justify-center gap-4">
          <div className={cn(`flex items-center justify-center rounded-2xl p-4`, gradeInfo.bg)}>
            <span className={`text-5xl font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</span>
          </div>
          <div className="text-left">
            <div className="text-3xl font-bold text-gray-900">{totalScore}</div>
            <div className="text-sm text-gray-500">综合评分</div>
          </div>
        </div>
        {session?.scenarioName && (
          <div className="mt-3 text-sm text-gray-500">
            场景: {session.scenarioName} | 轮数: {session.round}
          </div>
        )}
      </Card>

      {/* Emotion Timeline + Round Scores */}
      {(roundData.emotions.length > 0 || roundData.scores.length > 0) && (
        <Card>
          <div className="space-y-6">
            <EmotionTimeline emotions={roundData.emotions} />
            {roundData.scores.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <RoundScores scores={roundData.scores} />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Radar Chart */}
      <Card>
        <h4 className="mb-4 text-sm font-medium text-gray-700">能力雷达图</h4>
        <div className="flex justify-center">
          <RadarChart
            dimensions={radarDimensions}
            size={280}
            onClick={handleDimensionClick}
            highlightedDimension={selectedDimension ?? undefined}
          />
        </div>
        <p className="mt-2 text-center text-xs text-gray-400">点击维度查看详情</p>
      </Card>

      {/* Dimension Detail Panel */}
      {selectedDimension && (
        <Card className="border-primary-200 bg-primary-50/30">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-semibold text-primary-800">{selectedDimension}</h4>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-2xl font-bold text-primary-600">
                  {summary?.radarScores[selectedDimension] ?? 0}分
                </span>
                <span className="text-xs text-gray-500">/ 100</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedDimension(null)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {/* Relevant strengths/improvements */}
            {summary && summary.strengths.length > 0 && (
              <div>
                <h5 className="mb-1 text-xs font-medium text-green-700">相关优势</h5>
                <ul className="space-y-1">
                  {summary.strengths.slice(0, 2).map((item, i) => (
                    <li key={i} className="text-xs text-gray-600">• {item}</li>
                  ))}
                </ul>
              </div>
            )}
            {summary && summary.improvements.length > 0 && (
              <div>
                <h5 className="mb-1 text-xs font-medium text-amber-700">改进建议</h5>
                <ul className="space-y-1">
                  {summary.improvements.slice(0, 2).map((item, i) => (
                    <li key={i} className="text-xs text-gray-600">• {item}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Action button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedDimension(null);
                // Reset practice and go back to setup with this skill pre-selected
                onRestart();
              }}
            >
              前往专项训练
            </Button>
          </div>
        </Card>
      )}

      {/* Strengths */}
      <Card>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-green-700">
          <CheckCircle className="h-4 w-4" />
          亮点 (Strengths)
        </h4>
        <ul className="space-y-2">
          {(summary?.strengths ?? [
            '能够主动提问挖掘客户需求',
            '善用共情回应化解客户抵触情绪',
            '产品介绍逻辑清晰，重点突出',
          ]).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-0.5 text-green-500">&#10004;</span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      {/* Improvements */}
      <Card>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-700">
          <Wrench className="h-4 w-4" />
          改进建议 (Improvements)
        </h4>
        <ul className="space-y-2">
          {(summary?.improvements ?? [
            '促单时机把握不够准确，可以尝试更早地推动决策',
            '面对价格异议时缺少具体数据支撑',
            '可以更多使用客户案例增强说服力',
          ]).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-0.5 text-amber-500">&#128295;</span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      {/* Recommendations */}
      <Card>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-700">
          <Lightbulb className="h-4 w-4" />
          推荐训练
        </h4>
        <ul className="space-y-2">
          {(summary?.recommendations ?? [
            '建议针对"促单技巧"进行专项突破训练',
            '复习知识库中"价格谈判"相关话术',
          ]).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-blue-500">&#9679;</span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      {/* Action */}
      <div className="flex justify-center">
        <Button size="lg" onClick={onRestart}>
          <RotateCcw className="mr-2 h-4 w-4" />
          再来一次
        </Button>
      </div>
    </div>
  );
}
