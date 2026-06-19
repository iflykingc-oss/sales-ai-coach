import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, Brain, RotateCcw, FileSearch, Download, Copy, Link,
  TrendingUp, ChevronDown, ChevronUp, Gauge, ArrowRight,
  Sparkles, Star, Award, BarChart3, Clock, MessageSquare, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RadarChart } from '@/components/ui/RadarChart';
import type { RadarDimension } from '@/components/ui/RadarChart';
import { usePracticeStore } from '@/stores/practiceStore';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';
import { toast } from '@/hooks/useToast';
import { EVALUATION_DIMENSIONS } from '@sales-ai-coach/shared';
import EmotionTimeline from './EmotionTimeline';

const defaultDimensions: string[] = [...EVALUATION_DIMENSIONS];

interface RoundAnalysis {
  round: number;
  score: number;
  summary: string;
  feedback: string;
  improvement?: string;
}

interface Exercise {
  title: string;
  description: string;
  difficulty: string;
  target_dimension?: string;
}

interface PracticeReportData {
  transcript?: Array<Record<string, unknown>>;
  round_analysis?: RoundAnalysis[];
  radarScores?: Record<string, number>;
  improvement_plan?: {
    priority?: string;
    exercises?: Exercise[];
    timeline?: string;
  };
}

interface PracticeSummaryProps {
  onRestart: () => void;
}

// Animated counter component
function AnimatedCounter({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.round(target * easeOutQuart));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration]);

  return <>{count}</>;
}

// Grade badge component
const GradeBadge = memo(function GradeBadge({ grade }: { grade: string }) {
  const gradeConfig: Record<string, { color: string; bg: string; glow: string; label: string }> = {
    S: { color: 'from-amber-400 to-yellow-500', bg: 'bg-amber-500/10', glow: 'shadow-amber-500/30', label: '卓越' },
    A: { color: 'from-emerald-400 to-green-500', bg: 'bg-emerald-500/10', glow: 'shadow-emerald-500/30', label: '优秀' },
    B: { color: 'from-blue-400 to-cyan-500', bg: 'bg-blue-500/10', glow: 'shadow-blue-500/30', label: '良好' },
    C: { color: 'from-orange-400 to-amber-500', bg: 'bg-orange-500/10', glow: 'shadow-orange-500/30', label: '一般' },
    D: { color: 'from-red-400 to-rose-500', bg: 'bg-red-500/10', glow: 'shadow-red-500/30', label: '待改进' },
  };

  const config = gradeConfig[grade] || gradeConfig.B;

  return (
    <div className="relative">
      {/* Glow effect */}
      <div className={cn(
        'absolute inset-0 rounded-3xl blur-2xl opacity-50',
        config.bg
      )} />

      {/* Badge */}
      <div className={cn(
        'relative flex flex-col items-center justify-center',
        'rounded-3xl border border-white/20 backdrop-blur-xl',
        'bg-gradient-to-br from-white/80 to-white/40',
        'p-8 shadow-2xl',
        config.glow
      )}>
        <div className={cn(
          'text-8xl font-black bg-gradient-to-br bg-clip-text text-transparent',
          config.color
        )}>
          {grade}
        </div>
        <div className="mt-2 text-sm font-medium text-gray-500">
          {config.label}
        </div>
      </div>
    </div>
  );
});

// Stat card component
const StatCard = memo(function StatCard({ icon: Icon, label, value, trend, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: { value: number; isPositive: boolean };
  color: string;
}) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border border-white/20 backdrop-blur-xl',
      'bg-gradient-to-br from-white/80 to-white/40 p-5',
      'transition-all duration-300 hover:scale-[1.02] hover:shadow-lg'
    )}>
      <div className="flex items-start justify-between">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl',
          color
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
            trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}>
            <TrendingUp className={cn('h-3 w-3', !trend.isPositive && 'rotate-180')} />
            {trend.value}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="mt-1 text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
});

// Dimension bar component
const DimensionBar = memo(function DimensionBar({ label, score, delay = 0 }: {
  label: string;
  score: number;
  delay?: number;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(score), delay);
    return () => clearTimeout(timer);
  }, [score, delay]);

  const getColor = (score: number) => {
    if (score >= 85) return 'from-emerald-400 to-green-500';
    if (score >= 75) return 'from-blue-400 to-cyan-500';
    if (score >= 70) return 'from-amber-400 to-yellow-500';
    return 'from-red-400 to-rose-500';
  };

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{score}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out',
            getColor(score)
          )}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
});

export function PracticeSummary({ onRestart }: PracticeSummaryProps) {
  const { session, summary, setSummary, setIsGeneratingSummary } = usePracticeStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const [reportData, setReportData] = useState<PracticeReportData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Auto-save when reportData is available
  useEffect(() => {
    if (!session || !reportData || saved || saving) return;
    const autoSave = async () => {
      setSaving(true);
      try {
        const radarScores = reportData?.radarScores || {};
        await api.post('/practices/save', {
          sessionId: session.linkedSessionId || null,
          scriptId: session.linkedScriptId || null,
          scenario: session.scenarioName || '',
          industry: session.industry || '',
          rounds: session.round,
          score: summary?.totalScore || 0,
          feedback: reportData,
          transcript: reportData?.transcript || [],
          radarScores,
        });
        setSaved(true);
      } catch (err) {
        console.error('Failed to save practice:', err);
        toast.error('练习保存失败', { description: '数据可能丢失，请重试' });
      } finally {
        setSaving(false);
      }
    };
    autoSave();
  }, [session, reportData, saved, saving, summary]);

  const handleSaveAndReview = useCallback(async () => {
    if (!session || !reportData) return;
    const practiceId = session.linkedSessionId;
    navigate('/app/review', {
      state: { practiceSessionId: practiceId, autoReview: true },
    });
  }, [session, reportData, navigate]);

  const handleDimensionClick = useCallback((dim: RadarDimension) => {
    setSelectedDimension((prev) => (prev === dim.label ? null : dim.label));
  }, []);

  useEffect(() => {
    if (!session || summary) {
      setLoading(false);
      return;
    }

    const fetchReport = async () => {
      setIsGeneratingSummary(true);
      try {
        const response = await api.post('/practices/report', {
          sessionId: session.id,
        });

        const report = response.data.data;
        if (report && report.radarScores) {
          const normalizedScores: Record<string, number> = {};
          for (const dim of defaultDimensions) {
            normalizedScores[dim] = report.radarScores[dim] ?? 0;
          }
          setSummary({
            sessionId: session.id,
            totalScore: Math.round(report.overall_score * 100),
            strengths: report.strengths || [],
            improvements: report.weaknesses || [],
            recommendations: report.recommendations?.map((r: Record<string, string>) =>
              `${r.dimension}: ${r.advice}`,
            ) || [],
            radarScores: normalizedScores,
          });
          setReportData(report as PracticeReportData);
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
    if (score >= 90) return 'S';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  };

  const grade = getScoreGrade(totalScore);

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

  // Top dimensions
  const topDimensions = useMemo(() => {
    return [...radarDimensions].sort((a, b) => b.score - a.score).slice(0, 3);
  }, [radarDimensions]);

  // Weak dimensions
  const weakDimensions = useMemo(() => {
    return [...radarDimensions].sort((a, b) => a.score - b.score).slice(0, 2);
  }, [radarDimensions]);

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

综合评分: ${totalScore}分 (${grade}级)

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
  }, [summary, session, totalScore, grade, radarDimensions]);

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
综合评分: ${totalScore}分 (${grade}级)

最强维度: ${topDimensions.map(d => d.label).join('、')}
待改进: ${weakDimensions.map(d => d.label).join('、')}

${summary.strengths.length > 0 ? '优势:\n' + summary.strengths.map(s => `✓ ${s}`).join('\n') : ''}
    `.trim();

    navigator.clipboard.writeText(reportText).then(() => {
      toast.success('报告摘要已复制到剪贴板');
    }).catch(() => {
      toast.error('复制失败');
    });
  }, [summary, session, totalScore, grade, topDimensions, weakDimensions]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-64 animate-pulse rounded-3xl bg-gray-100" />
        <div className="h-48 animate-pulse rounded-3xl bg-gray-100" />
        <div className="h-32 animate-pulse rounded-3xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section with Score */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 md:p-12">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Gradient orbs */}
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="relative flex flex-col items-center gap-8 md:flex-row">
          {/* Grade Badge */}
          <div className="flex-shrink-0">
            <GradeBadge grade={grade} />
          </div>

          {/* Score Details */}
          <div className="flex-1 text-center md:text-left">
            <div className="text-sm font-medium text-gray-400">成单概率评估</div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-6xl font-black text-white">
                <AnimatedCounter target={totalScore} />
              </span>
              <span className="text-2xl text-gray-400">%</span>
            </div>
            <div className="mt-2 text-sm text-gray-400">
              {totalScore >= 80 ? '🎯 高成单概率 — 这个场景你已经很熟练了' :
               totalScore >= 60 ? '📈 中等成单概率 — 再练几次会更好' :
               '💪 需要加强 — 建议多练习这个场景'}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-400">
              {session?.scenarioName && (
                <span className="flex items-center gap-1.5">
                  <Target className="h-4 w-4" />
                  {session.scenarioName}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                {session?.round} 轮对话
              </span>
              {session?.archetypeName && (
                <span className="flex items-center gap-1.5">
                  <Brain className="h-4 w-4" />
                  {session.archetypeName}
                </span>
              )}
              {session?.difficulty && (
                <span className="flex items-center gap-1.5">
                  <Gauge className="h-4 w-4" />
                  {session.difficulty === 'easy' ? '初级' : session.difficulty === 'medium' ? '中级' : session.difficulty === 'hard' ? '高级' : '地狱'}
                </span>
              )}
            </div>

            {/* Top strengths */}
            {summary?.strengths && summary.strengths.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {summary.strengths.slice(0, 3).map((strength, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white backdrop-blur-sm"
                  >
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    {strength}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="flex gap-6 md:gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {topDimensions[0]?.score || 0}
              </div>
              <div className="mt-1 text-xs text-gray-400">最高维度</div>
              <div className="mt-0.5 text-xs text-blue-400">{topDimensions[0]?.label}</div>
            </div>
            <div className="h-12 w-px bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {roundData.scores.length > 0
                  ? Math.round(roundData.scores[roundData.scores.length - 1].score * 100)
                  : '-'}
              </div>
              <div className="mt-1 text-xs text-gray-400">末轮成单概率</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={Target}
          label="对话轮数"
          value={session?.round || 0}
          color="bg-blue-500"
        />
        <StatCard
          icon={Brain}
          label="最强技能"
          value={topDimensions[0]?.label || '-'}
          color="bg-purple-500"
        />
        <StatCard
          icon={TrendingUp}
          label="成单概率"
          value={`${totalScore}%`}
          color="bg-green-500"
        />
        <StatCard
          icon={Clock}
          label="练习时长"
          value={session ? `${Math.round((Date.now() - session.startedAt) / 60000)}分` : '-'}
          color="bg-amber-500"
        />
      </div>

      {/* Emotion Timeline & Radar Chart */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Emotion Timeline */}
        {roundData.emotions.length > 0 && (
          <Card className="overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="font-semibold text-gray-900">情绪变化轨迹</h3>
            </div>
            <div className="p-6">
              <EmotionTimeline emotions={roundData.emotions} />
            </div>
          </Card>
        )}

        {/* Radar Chart */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="font-semibold text-gray-900">能力雷达图</h3>
          </div>
          <div className="p-6">
            <RadarChart
              dimensions={radarDimensions}
              onClick={handleDimensionClick}
              highlightedDimension={selectedDimension || undefined}
            />
          </div>
        </Card>
      </div>

      {/* Dimension Breakdown */}
      <Card className="overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="font-semibold text-gray-900">维度详解</h3>
        </div>
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {radarDimensions.map((dim, i) => (
              <DimensionBar
                key={dim.label}
                label={dim.label}
                score={dim.score}
                delay={i * 100}
              />
            ))}
          </div>
        </div>
      </Card>

      {/* Round-by-Round Analysis */}
      {reportData?.round_analysis && reportData.round_analysis.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="font-semibold text-gray-900">逐轮分析</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {reportData.round_analysis.map((ra) => (
              <div key={ra.round} className="group">
                <button
                  className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50"
                  onClick={() => setExpandedRound(expandedRound === ra.round ? null : ra.round)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold',
                      ra.score >= 0.7 ? 'bg-green-100 text-green-700' :
                      ra.score >= 0.5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    )}>
                      {ra.round}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{ra.summary}</p>
                      {ra.improvement && (
                        <p className="mt-0.5 text-sm text-gray-500">{ra.improvement}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-bold',
                      ra.score >= 0.7 ? 'bg-green-100 text-green-700' :
                      ra.score >= 0.5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    )}>
                      {Math.round(ra.score * 100)}分
                    </span>
                    {expandedRound === ra.round ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>
                {expandedRound === ra.round && (
                  <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                    <p className="text-sm text-gray-600">{ra.feedback}</p>
                    {ra.improvement && (
                      <p className="mt-2 text-sm text-blue-600">
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

      {/* Strengths & Improvements */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Strengths */}
        {summary?.strengths && summary.strengths.length > 0 && (
          <Card className="overflow-hidden border-green-200 bg-green-50/30">
            <div className="border-b border-green-100 px-6 py-4">
              <h3 className="flex items-center gap-2 font-semibold text-green-800">
                <Star className="h-4 w-4 text-green-500" />
                优势亮点
              </h3>
            </div>
            <div className="p-6">
              <ul className="space-y-3">
                {summary.strengths.map((strength, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                      <Award className="h-3 w-3 text-green-600" />
                    </div>
                    <span className="text-sm text-green-800">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        )}

        {/* Improvements */}
        {summary?.improvements && summary.improvements.length > 0 && (
          <Card className="overflow-hidden border-amber-200 bg-amber-50/30">
            <div className="border-b border-amber-100 px-6 py-4">
              <h3 className="flex items-center gap-2 font-semibold text-amber-800">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                待改进项
              </h3>
            </div>
            <div className="p-6">
              <ul className="space-y-3">
                {summary.improvements.map((improvement, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-100">
                      <ArrowRight className="h-3 w-3 text-amber-600" />
                    </div>
                    <span className="text-sm text-amber-800">{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        )}
      </div>

      {/* Improvement Plan */}
      {reportData?.improvement_plan && (
        <Card className="overflow-hidden border-blue-200 bg-blue-50/30">
          <div className="border-b border-blue-100 px-6 py-4">
            <h3 className="flex items-center gap-2 font-semibold text-blue-800">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              改进计划
            </h3>
          </div>
          <div className="p-6">
            {reportData.improvement_plan.priority && (
              <p className="mb-4 text-sm text-blue-800">
                <span className="font-medium">优先改进: </span>
                {reportData.improvement_plan.priority}
              </p>
            )}
            {reportData.improvement_plan.exercises && reportData.improvement_plan.exercises.length > 0 && (
              <div className="space-y-3">
                {reportData.improvement_plan.exercises.map((ex: any, i: number) => (
                  <div key={i} className="rounded-xl border border-blue-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-900">{ex.title}</span>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        ex.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        ex.difficulty === 'hard' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      )}>
                        {ex.difficulty === 'easy' ? '入门' : ex.difficulty === 'hard' ? '进阶' : '标准'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{ex.description}</p>
                    {ex.target_dimension && (
                      <p className="mt-2 text-xs text-blue-500">目标: {ex.target_dimension}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {reportData.improvement_plan.timeline && (
              <p className="mt-4 text-sm text-blue-600">
                <Clock className="mr-1 inline h-3.5 w-3.5" />
                建议周期: {reportData.improvement_plan.timeline}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Button
          size="lg"
          onClick={onRestart}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          再来一次
        </Button>
        {/* 针对弱项练习 */}
        {reportData?.radarScores && (() => {
          const weakDim = Object.entries(reportData.radarScores as Record<string, number>)
            .sort(([, a], [, b]) => a - b)[0];
          if (weakDim && weakDim[1] < 70) {
            return (
              <Button
                size="lg"
                onClick={() => navigate('/app/practice', {
                  state: {
                    fromScript: false,
                    scenario: `专项练习: ${weakDim[0]}`,
                    scriptContent: '',
                    industry: session?.industry || '',
                    focusDimension: weakDim[0],
                  },
                })}
              >
                <Target className="mr-2 h-4 w-4" />
                针对「{weakDim[0]}」专项练习
              </Button>
            );
          }
          return null;
        })()}
        {reportData && (
          <Button
            size="lg"
            variant="secondary"
            onClick={handleSaveAndReview}
            disabled={saving}
          >
            <FileSearch className="mr-2 h-4 w-4" />
            {saving ? '保存中...' : saved ? '查看复盘报告' : '保存并复盘'}
          </Button>
        )}
      </div>

      {/* Export & Share */}
      {summary && (
        <Card>
          <h4 className="mb-4 text-sm font-medium text-gray-700">导出与分享</h4>
          <div className="flex flex-wrap gap-3">
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

      {/* Recommended Knowledge - Based on weak dimensions */}
      {summary && weakDimensions.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-purple-800">
            <BookOpen className="h-4 w-4" />
            推荐学习资料
          </h4>
          <p className="mb-3 text-sm text-purple-700">
            基于你的弱项维度，建议补充以下知识：
          </p>
          <div className="space-y-2">
            {weakDimensions.map((dim) => (
              <div key={dim.label} className="rounded-lg bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-900">{dim.label}</span>
                  <span className="text-xs text-purple-600">{dim.score}分</span>
                </div>
                <p className="mt-1 text-xs text-purple-600">
                  {dim.label === '需求挖掘' && '学习SPIN提问法，多用开放性问题了解客户需求。'}
                  {dim.label === '异议处理' && '掌握LAER四步法：倾听→认同→探索→回应。'}
                  {dim.label === '促单能力' && '学习试探性收尾和假设成交技巧。'}
                  {dim.label === '沟通表达' && '练习简洁表达，避免过多专业术语。'}
                  {dim.label === '情绪管理' && '保持冷静，不因客户情绪波动而失控。'}
                  {dim.label === '产品知识' && '深入了解产品特性和竞品对比。'}
                  {dim.label === '信任建立' && '通过案例和数据建立专业信任。'}
                  {dim.label === '价值传递' && '用FAB法则：特性→优势→利益。'}
                  {dim.label === 'SPIN提问质量' && '多练习情境、问题、暗示、需求-效益四类提问。'}
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/app/knowledge')}
            className="mt-3 text-sm font-medium text-purple-600 hover:text-purple-800"
          >
            查看知识库 →
          </button>
        </Card>
      )}
    </div>
  );
}
