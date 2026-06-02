import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Wrench, Lightbulb, CheckCircle, RotateCcw, BarChart3, Target, ClipboardList, ChevronDown, ChevronUp, FileSearch, Network, Gauge, Zap, Download, Copy, Link } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RadarChart } from '@/components/ui/RadarChart';
import type { RadarDimension } from '@/components/ui/RadarChart';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePracticeStore } from '@/stores/practiceStore';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';
import { EVALUATION_DIMENSIONS } from '@sales-ai-coach/shared';
import { toast } from '@/hooks/useToast';
import EmotionTimeline from './EmotionTimeline';
import RoundScores from './RoundScores';

const defaultDimensions: string[] = [...EVALUATION_DIMENSIONS];

interface PracticeSummaryProps {
  onRestart: () => void;
}

export function PracticeSummary({ onRestart }: PracticeSummaryProps) {
  const { session, summary, setSummary, setIsGeneratingSummary } = usePracticeStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const handleSaveAndReview = useCallback(async () => {
    if (!session || !reportData) return;
    setSaving(true);
    try {
      // Save practice session to DB
      const saveRes = await api.post('/practices/save', {
        sessionId: session.linkedSessionId || null,
        scriptId: session.linkedScriptId || null,
        scenario: session.scenarioName || '',
        industry: session.industry || '',
        rounds: session.round,
        score: summary?.totalScore ? summary.totalScore / 100 : 0,
        feedback: reportData,
        transcript: reportData.transcript || [],
      });
      const practiceId = saveRes.data?.data?.id;

      // Navigate to review with practice session ID
      navigate('/app/review', {
        state: { practiceSessionId: practiceId, autoReview: true },
      });
    } catch (err) {
      console.error('Failed to save practice:', err);
    } finally {
      setSaving(false);
    }
  }, [session, reportData, summary, navigate]);

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
          setReportData(report);
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

  // Export functions
  const handleExport = useCallback(() => {
    if (!summary || !session) return;

    const reportText = `
销冠AI教练 - 陪练报告
========================

场景: ${session.scenarioName || '自由对练'}
轮数: ${session.round}
买家类型: ${session.archetypeName || '未知'}
难度: ${session.difficulty === 'easy' ? '初级' : session.difficulty === 'medium' ? '中级' : session.difficulty === 'hard' ? '高级' : '地狱'}

综合评分: ${totalScore}分 (${gradeInfo.grade}级)

维度评分:
${radarDimensions.map(d => `- ${d.label}: ${d.score}分`).join('\n')}

优势:
${summary.strengths.map(s => `- ${s}`).join('\n')}

待改进:
${summary.improvements.map(i => `- ${i}`).join('\n')}

建议:
${summary.recommendations.map(r => `- ${r}`).join('\n')}

生成时间: ${new Date().toLocaleString('zh-CN')}
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `陪练报告-${session.scenarioName || '自由对练'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('报告已导出');
  }, [summary, session, totalScore, gradeInfo, radarDimensions]);

  const handleCopyLink = useCallback(() => {
    const link = `${window.location.origin}/app/practice/summary/${session?.id || 'latest'}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success('分享链接已复制到剪贴板');
    }).catch(() => {
      toast.error('复制失败，请手动复制');
    });
  }, [session]);

  const handleCopyReport = useCallback(() => {
    if (!summary) return;

    const reportText = `
【销冠AI教练 - 陪练报告】

场景: ${session?.scenarioName || '自由对练'}
综合评分: ${totalScore}分 (${gradeInfo.grade}级)

最强维度: ${radarDimensions.sort((a, b) => b.score - a.score).slice(0, 3).map(d => d.label).join('、')}
待改进: ${summary.improvements.slice(0, 2).join('、')}

${summary.strengths.length > 0 ? '优势:\n' + summary.strengths.map(s => `✓ ${s}`).join('\n') : ''}
    `.trim();

    navigator.clipboard.writeText(reportText).then(() => {
      toast.success('报告摘要已复制到剪贴板');
    }).catch(() => {
      toast.error('复制失败');
    });
  }, [summary, session, totalScore, gradeInfo, radarDimensions]);

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
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-gray-500">
          {session?.scenarioName && <span>场景: {session.scenarioName}</span>}
          {session?.scenarioName && <span>|</span>}
          <span>轮数: {session?.round}</span>
          {session?.archetypeName && (
            <>
              <span>|</span>
              <span>买家类型: {session.archetypeName}</span>
            </>
          )}
          {session?.difficulty && (
            <>
              <span>|</span>
              <span>难度: {session.difficulty === 'easy' ? '初级' : session.difficulty === 'medium' ? '中级' : session.difficulty === 'hard' ? '高级' : '地狱'}</span>
            </>
          )}
        </div>
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
      {summary && summary.strengths.length > 0 && (
        <Card>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-green-700">
            <CheckCircle className="h-4 w-4" />
            亮点 (Strengths)
          </h4>
          <ul className="space-y-2">
            {summary.strengths.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 text-green-500">&#10004;</span>
                {item}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Improvements */}
      {summary && summary.improvements.length > 0 && (
        <Card>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-700">
            <Wrench className="h-4 w-4" />
            改进建议 (Improvements)
          </h4>
          <ul className="space-y-2">
            {summary.improvements.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 text-amber-500">&#128295;</span>
                {item}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Recommendations */}
      {summary && summary.recommendations.length > 0 && (
        <Card>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-700">
            <Lightbulb className="h-4 w-4" />
            推荐训练
          </h4>
          <ul className="space-y-2">
            {summary.recommendations.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-blue-500">&#9679;</span>
                {item}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Round-by-Round Analysis */}
      {reportData?.round_analysis && reportData.round_analysis.length > 0 && (
        <Card>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
            <BarChart3 className="h-4 w-4" />
            逐轮诊断
          </h4>
          <div className="space-y-2">
            {reportData.round_analysis.map((ra: any) => (
              <div key={ra.round} className="rounded-lg border border-gray-100">
                <button
                  onClick={() => setExpandedRound(expandedRound === ra.round ? null : ra.round)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white',
                      ra.score >= 0.7 ? 'bg-green-500' : ra.score >= 0.5 ? 'bg-yellow-500' : 'bg-red-500',
                    )}>
                      {ra.round}
                    </span>
                    <span className="text-sm text-gray-800">{ra.summary}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-xs font-medium',
                      ra.score >= 0.7 ? 'text-green-600' : ra.score >= 0.5 ? 'text-yellow-600' : 'text-red-600',
                    )}>
                      {Math.round(ra.score * 100)}分
                    </span>
                    {expandedRound === ra.round ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </button>
                {expandedRound === ra.round && (
                  <div className="border-t border-gray-100 px-3 py-3 space-y-2">
                    <p className="text-sm text-gray-600">{ra.feedback}</p>
                    {ra.improvement && (
                      <p className="text-sm text-blue-600">
                        <span className="font-medium">改进建议: </span>{ra.improvement}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Best Practice Comparison */}
      {reportData?.best_practice_comparison && (
        <Card>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-indigo-700">
            <Target className="h-4 w-4" />
            最佳实践对比
          </h4>
          <div className="mb-3 flex items-center gap-3">
            <div className="text-center">
              <div className={cn(
                'text-2xl font-bold',
                reportData.best_practice_comparison.score >= 80 ? 'text-green-600' :
                reportData.best_practice_comparison.score >= 60 ? 'text-yellow-600' : 'text-red-600',
              )}>
                {reportData.best_practice_comparison.score}
              </div>
              <div className="text-xs text-gray-500">匹配度</div>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex-1 text-sm text-gray-600">
              与行业最佳实践的匹配程度
            </div>
          </div>
          {reportData.best_practice_comparison.gaps?.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-medium text-amber-600">差距</p>
              <ul className="space-y-1">
                {reportData.best_practice_comparison.gaps.map((gap: string, i: number) => (
                  <li key={i} className="text-sm text-gray-600">- {gap}</li>
                ))}
              </ul>
            </div>
          )}
          {reportData.best_practice_comparison.highlights?.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-green-600">亮点</p>
              <ul className="space-y-1">
                {reportData.best_practice_comparison.highlights.map((h: string, i: number) => (
                  <li key={i} className="text-sm text-gray-600">+ {h}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Framework Analysis */}
      {reportData?.frameworkAnalysis && (
        <Card className="border-violet-200 bg-violet-50/30">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-violet-700">
            <Network className="h-4 w-4" />
            销售框架分析
          </h4>
          <div className="mb-3 flex items-center gap-3">
            <div className="text-center">
              <div className={cn(
                'text-2xl font-bold',
                reportData.frameworkAnalysis.frameworkUsageQuality >= 80 ? 'text-green-600' :
                reportData.frameworkAnalysis.frameworkUsageQuality >= 60 ? 'text-yellow-600' : 'text-red-600',
              )}>
                {reportData.frameworkAnalysis.frameworkUsageQuality}
              </div>
              <div className="text-xs text-gray-500">框架运用</div>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex-1 text-sm text-gray-600">
              {reportData.frameworkAnalysis.stageProgression || '未检测到明确的框架使用'}
            </div>
          </div>
          {reportData.frameworkAnalysis.detectedFrameworks?.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-medium text-violet-600">识别到的框架</p>
              <div className="flex flex-wrap gap-1">
                {reportData.frameworkAnalysis.detectedFrameworks.map((fw: string, i: number) => (
                  <span key={i} className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">{fw}</span>
                ))}
              </div>
            </div>
          )}
          {reportData.frameworkAnalysis.frameworkStrengths?.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 text-xs font-medium text-green-600">框架运用亮点</p>
              <ul className="space-y-1">
                {reportData.frameworkAnalysis.frameworkStrengths.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-gray-600">+ {s}</li>
                ))}
              </ul>
            </div>
          )}
          {reportData.frameworkAnalysis.frameworkGaps?.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 text-xs font-medium text-amber-600">框架运用不足</p>
              <ul className="space-y-1">
                {reportData.frameworkAnalysis.frameworkGaps.map((g: string, i: number) => (
                  <li key={i} className="text-sm text-gray-600">- {g}</li>
                ))}
              </ul>
            </div>
          )}
          {reportData.frameworkAnalysis.suggestedFrameworks?.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-blue-600">建议学习的框架</p>
              <div className="flex flex-wrap gap-1">
                {reportData.frameworkAnalysis.suggestedFrameworks.map((fw: string, i: number) => (
                  <span key={i} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{fw}</span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* BANT Qualification Score */}
      {reportData?.bantScore && reportData.bantScore.overall && (
        <Card className="border-sky-200 bg-sky-50/30">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-sky-700">
            <Gauge className="h-4 w-4" />
            BANT线索判定
          </h4>
          <div className="mb-3 flex items-center gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-sky-600">
                {reportData.bantScore.overall.score}
              </div>
              <div className="text-xs text-gray-500">综合评分</div>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="text-sm font-medium text-sky-700">
              {reportData.bantScore.overall.rating}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {["budget", "authority", "need", "timeline"].map((dim) => {
              const labels: Record<string, string> = { budget: "预算", authority: "决策权", need: "需求", timeline: "时间线" };
              const d = reportData.bantScore[dim];
              if (!d) return null;
              return (
                <div key={dim} className="rounded-lg bg-white p-2 border border-sky-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">{labels[dim]}</span>
                    <span className={cn(
                      'text-xs font-bold',
                      d.score >= 7 ? 'text-green-600' : d.score >= 4 ? 'text-yellow-600' : 'text-red-600',
                    )}>
                      {d.score}/10
                    </span>
                  </div>
                  <span className={cn(
                    'text-[10px]',
                    d.status === '已确认' ? 'text-green-500' : d.status === '部分确认' ? 'text-yellow-500' : 'text-gray-400',
                  )}>
                    {d.status}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Signal Analysis */}
      {reportData?.signalAnalysis && (
        <Card className="border-orange-200 bg-orange-50/30">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-orange-700">
            <Zap className="h-4 w-4" />
            信号分析
          </h4>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{reportData.signalAnalysis.buying_signals}</div>
              <div className="text-xs text-gray-500">购买信号</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-600">{reportData.signalAnalysis.objections}</div>
              <div className="text-xs text-gray-500">异议次数</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">{reportData.signalAnalysis.decision_readiness * 100}%</div>
              <div className="text-xs text-gray-500">决策就绪</div>
            </div>
          </div>
          {reportData.signalAnalysis.pain_points?.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-medium text-orange-600 mb-1">客户痛点</p>
              <div className="flex flex-wrap gap-1">
                {reportData.signalAnalysis.pain_points.map((p: string, i: number) => (
                  <span key={i} className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">{p}</span>
                ))}
              </div>
            </div>
          )}
          {reportData.signalAnalysis.recommended_action && (
            <p className="text-xs text-orange-600 mt-2">
              <span className="font-medium">建议: </span>{reportData.signalAnalysis.recommended_action}
            </p>
          )}
        </Card>
      )}

      {/* Improvement Plan */}
      {reportData?.improvement_plan && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
            <ClipboardList className="h-4 w-4" />
            改进计划
          </h4>
          {reportData.improvement_plan.priority && (
            <p className="mb-3 text-sm text-emerald-800">
              <span className="font-medium">优先改进: </span>{reportData.improvement_plan.priority}
            </p>
          )}
          {reportData.improvement_plan.exercises?.length > 0 && (
            <div className="space-y-2">
              {reportData.improvement_plan.exercises.map((ex: any, i: number) => (
                <div key={i} className="rounded-lg border border-emerald-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-800">{ex.title}</span>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px]',
                      ex.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                      ex.difficulty === 'hard' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700',
                    )}>
                      {ex.difficulty === 'easy' ? '入门' : ex.difficulty === 'hard' ? '进阶' : '标准'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">{ex.description}</p>
                  {ex.target_dimension && (
                    <p className="mt-1 text-[10px] text-emerald-500">目标: {ex.target_dimension}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          {reportData.improvement_plan.timeline && (
            <p className="mt-3 text-xs text-emerald-600">
              建议周期: {reportData.improvement_plan.timeline}
            </p>
          )}
        </Card>
      )}

      {/* No data message */}
      {summary && summary.strengths.length === 0 && summary.improvements.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-500">本次陪练暂未生成详细反馈，请完成更多轮对话</p>
        </div>
      )}

      {/* Action */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button size="lg" onClick={onRestart}>
          <RotateCcw className="mr-2 h-4 w-4" />
          再来一次
        </Button>
        {reportData && (
          <Button
            size="lg"
            variant="secondary"
            onClick={handleSaveAndReview}
            disabled={saving}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <FileSearch className="mr-2 h-4 w-4" />
            {saving ? '保存中...' : '保存并复盘'}
          </Button>
        )}
      </div>

      {/* Export & Share */}
      {summary && (
        <Card>
          <h4 className="mb-3 text-sm font-medium text-gray-700">导出与分享</h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              导出报告
            </Button>
            <Button variant="secondary" size="sm" onClick={handleCopyReport}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              复制摘要
            </Button>
            <Button variant="secondary" size="sm" onClick={handleCopyLink}>
              <Link className="mr-1.5 h-3.5 w-3.5" />
              复制分享链接
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
