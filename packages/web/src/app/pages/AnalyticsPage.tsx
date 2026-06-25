import { logger } from '@/utils/logger';
import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Target, BarChart3, Flame } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { RadarChart } from '@/components/ui/RadarChart';
import type { RadarDimension } from '@/components/ui/RadarChart';
import { useAchievementStore } from '@/stores/achievementStore';
import { LevelProgress } from '@/components/achievement/LevelProgress';
import { StreakDisplay } from '@/components/achievement/StreakDisplay';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';
import { useNavigate } from 'react-router-dom';
import { EVALUATION_DIMENSIONS } from '@sales-ai-coach/shared';

interface AnalyticsData {
  totalSessions: number;
  practiceTrend: Array<{ date: string; score: number; scenario: string; difficulty: string }>;
  skillTrend: Array<{ week: string; scores: Record<string, number> }>;
  difficultyDistribution: Record<string, number>;
  topScenarios: Array<{ name: string; count: number }>;
  scoreByDifficulty: Record<string, { avg: number; count: number }>;
  recentImprovement: number;
  practiceDates: string[];
  averageScore: number;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '初级',
  medium: '中级',
  hard: '高级',
  expert: '地狱',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
  expert: 'bg-purple-100 text-purple-700',
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { progress, fetchProgress } = useAchievementStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [analyticsRes] = await Promise.all([
          api.get('/achievements/analytics'),
          fetchProgress(),
        ]);
        const data = analyticsRes.data?.data || analyticsRes.data;
        setAnalytics(data);
      } catch (err) {
        logger.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Build radar data from latest skill scores
  const radarDimensions: RadarDimension[] = useMemo(() => {
    if (!analytics?.skillTrend?.length) {
      return EVALUATION_DIMENSIONS.map((label) => ({ label, score: 0 }));
    }
    const latest = analytics.skillTrend[analytics.skillTrend.length - 1];
    return EVALUATION_DIMENSIONS.map((label) => ({
      label,
      score: latest.scores[label] ?? 0,
    }));
  }, [analytics]);

  // Find weakest skill
  const weakestSkill = useMemo(() => {
    if (!radarDimensions.length) return null;
    return radarDimensions.reduce((min, d) => d.score < min.score ? d : min, radarDimensions[0]);
  }, [radarDimensions]);

  // Skill trend chart data (last 6 weeks)
  const skillChartData = useMemo(() => {
    if (!analytics?.skillTrend?.length) return [];
    return analytics.skillTrend.slice(-6);
  }, [analytics]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton.Card />
        <div className="grid gap-6 sm:grid-cols-2">
          <Skeleton.Card />
          <Skeleton.Card />
        </div>
        <Skeleton.Card />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">数据分析</h2>
        <p className="mt-1 text-sm text-gray-500">追踪你的销售技能成长轨迹</p>
      </div>

      {/* Top Stats Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          icon={<BarChart3 className="h-5 w-5 text-blue-500" />}
          label="总练习次数"
          value={analytics?.totalSessions ?? 0}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<Target className="h-5 w-5 text-green-500" />}
          label="平均分数"
          value={analytics?.averageScore ?? 0}
          suffix="分"
          bg="bg-green-50"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-amber-500" />}
          label="近期提升"
          value={analytics?.recentImprovement ?? 0}
          prefix={analytics?.recentImprovement && analytics.recentImprovement > 0 ? '+' : ''}
          suffix="分"
          bg="bg-amber-50"
        />
        <StatCard
          icon={<Flame className="h-5 w-5 text-orange-500" />}
          label="当前连续"
          value={progress?.currentStreak ?? 0}
          suffix="天"
          bg="bg-orange-50"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Radar Chart + Skill Analysis */}
        <Card className="lg:col-span-2">
          <h4 className="mb-4 text-sm font-medium text-gray-700">能力雷达图</h4>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <RadarChart dimensions={radarDimensions} size={220} />
            </div>
            <div className="flex-1 space-y-2">
              {radarDimensions
                .sort((a, b) => b.score - a.score)
                .map((d) => (
                  <div key={d.label} className="flex items-center gap-2">
                    <span className="w-20 text-xs text-gray-500 truncate">{d.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          d.score >= 80 ? 'bg-green-500' : d.score >= 60 ? 'bg-blue-500' : d.score >= 40 ? 'bg-amber-500' : 'bg-red-500',
                        )}
                        style={{ width: `${d.score}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs font-medium text-gray-700">{d.score}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Weakest skill recommendation */}
          {weakestSkill && weakestSkill.score > 0 && weakestSkill.score < 70 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">建议重点提升</span>
              </div>
              <p className="mt-1 text-sm text-amber-700">
                「{weakestSkill.label}」得分 {weakestSkill.score}，低于其他维度。
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-auto p-0 text-amber-700 underline"
                  onClick={() => navigate('/app/practice')}
                >
                  前往专项练习
                </Button>
              </p>
            </div>
          )}
        </Card>

        {/* Right Sidebar: Level + Streak */}
        <div className="space-y-4">
          {progress && progress.currentLevel && (
            <LevelProgress
              currentLevel={progress.currentLevel}
              nextLevel={progress.nextLevel}
              totalXp={progress.totalXp}
              xpForNextLevel={progress.xpForNextLevel}
            />
          )}
          {progress && (
            <StreakDisplay
              currentStreak={progress.currentStreak}
              longestStreak={progress.longestStreak}
              practiceDates={analytics?.practiceDates}
            />
          )}
        </div>
      </div>

      {/* Practice Trend + Difficulty Distribution */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Score Trend (last 10 sessions) */}
        <Card>
          <h4 className="mb-4 text-sm font-medium text-gray-700">分数趋势（最近练习）</h4>
          {analytics?.practiceTrend && analytics.practiceTrend.length > 1 ? (
            <MiniLineChart data={analytics.practiceTrend.slice(-10).map((p) => p.score)} />
          ) : (
            <p className="text-sm text-gray-400">需要更多练习数据</p>
          )}
        </Card>

        {/* Difficulty Distribution */}
        <Card>
          <h4 className="mb-4 text-sm font-medium text-gray-700">难度分布</h4>
          {analytics?.difficultyDistribution && Object.keys(analytics.difficultyDistribution).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(analytics.difficultyDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([diff, count]) => {
                  const total = analytics.totalSessions || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={diff} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className={cn('rounded px-2 py-0.5 text-xs font-medium', DIFFICULTY_COLORS[diff] || 'bg-gray-100 text-gray-700')}>
                          {DIFFICULTY_LABELS[diff] || diff}
                        </span>
                        <span className="text-gray-500">{count}次 ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            diff === 'easy' ? 'bg-green-400' : diff === 'medium' ? 'bg-yellow-400' : diff === 'hard' ? 'bg-red-400' : 'bg-purple-400',
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">暂无数据</p>
          )}
        </Card>
      </div>

      {/* Skill Progression Over Time */}
      {skillChartData.length > 1 && (
        <Card>
          <h4 className="mb-4 text-sm font-medium text-gray-700">技能成长趋势（按周）</h4>
          <div className="overflow-x-auto">
            <div className="min-w-[500px]">
              <div className="flex items-end gap-1 h-40">
                {skillChartData.map((week, i) => {
                  const avg = Object.values(week.scores).reduce((a, b) => a + b, 0) / (Object.values(week.scores).length || 1);
                  return (
                    <div key={week.week} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-gray-500">{Math.round(avg)}</span>
                      <div
                        className={cn(
                          'w-full rounded-t transition-all',
                          i === skillChartData.length - 1 ? 'bg-primary-500' : 'bg-primary-200',
                        )}
                        style={{ height: `${(avg / 100) * 140}px` }}
                      />
                      <span className="text-[10px] text-gray-400">{week.week.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Top Scenarios + Score by Difficulty */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h4 className="mb-4 text-sm font-medium text-gray-700">常用场景</h4>
          {analytics?.topScenarios && analytics.topScenarios.length > 0 ? (
            <div className="space-y-2">
              {analytics.topScenarios.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-sm text-gray-700">{s.name}</span>
                  <span className="text-xs text-gray-400">{s.count}次</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">暂无数据</p>
          )}
        </Card>

        <Card>
          <h4 className="mb-4 text-sm font-medium text-gray-700">各难度平均分</h4>
          {analytics?.scoreByDifficulty && Object.keys(analytics.scoreByDifficulty).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(analytics.scoreByDifficulty)
                .sort(([a], [b]) => {
                  const order = ['easy', 'medium', 'hard', 'expert'];
                  return order.indexOf(a) - order.indexOf(b);
                })
                .map(([diff, { avg, count }]) => (
                  <div key={diff} className="flex items-center gap-3">
                    <span className={cn('rounded px-2 py-0.5 text-xs font-medium', DIFFICULTY_COLORS[diff] || 'bg-gray-100 text-gray-700')}>
                      {DIFFICULTY_LABELS[diff] || diff}
                    </span>
                    <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          avg >= 80 ? 'bg-green-400' : avg >= 60 ? 'bg-blue-400' : 'bg-amber-400',
                        )}
                        style={{ width: `${avg}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-medium text-gray-700">{avg}分</span>
                    <span className="text-xs text-gray-400">({count}次)</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">暂无数据</p>
          )}
        </Card>
      </div>

      {/* Practice Calendar Heatmap */}
      {analytics?.practiceDates && analytics.practiceDates.length > 0 && (
        <Card>
          <h4 className="mb-4 text-sm font-medium text-gray-700">练习日历（最近90天）</h4>
          <PracticeHeatmap dates={analytics.practiceDates} />
        </Card>
      )}
    </div>
  );
}

// --- Sub-components ---

function StatCard({ icon, label, value, prefix = '', suffix = '', bg }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  bg: string;
}) {
  return (
    <Card className="flex items-center gap-3">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', bg)}>
        {icon}
      </div>
      <div>
        <div className="text-lg font-bold text-gray-900">{prefix}{value}{suffix}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </Card>
  );
}

function MiniLineChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const h = 100;
  const w = 280;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 20) - 10;
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28">
      <polyline
        fill="none"
        stroke="currentColor"
        className="text-primary-400"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(' ')}
      />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / range) * (h - 20) - 10;
        return (
          <circle key={i} cx={x} cy={y} r="3" className="fill-primary-500" />
        );
      })}
    </svg>
  );
}

function PracticeHeatmap({ dates }: { dates: string[] }) {
  const dateSet = new Set(dates);
  const today = new Date();
  const days: Array<{ date: string; count: number }> = [];

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: dateSet.has(key) ? 1 : 0 });
  }

  // Group by week (7 days per row)
  const weeks: Array<Array<{ date: string; count: number }>> = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="flex gap-0.5 overflow-x-auto">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-0.5">
          {week.map((day) => (
            <div
              key={day.date}
              title={`${day.date}: ${day.count ? '已练习' : '未练习'}`}
              className={cn(
                'h-3 w-3 rounded-[2px] transition-colors',
                day.count > 0 ? 'bg-primary-500' : 'bg-gray-100',
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
