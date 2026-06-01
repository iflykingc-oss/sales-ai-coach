import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Brain, FileText, TrendingUp, ArrowRight, Zap, GitBranch, Crown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useUserStore } from '@/stores/userStore';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

interface PipelineSession {
  id: string;
  name: string;
  industry: string | null;
  stage: string;
  status: string;
  customerName: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { scripts: number; practices: number; reviews: number };
}

interface DashboardData {
  stats: {
    totalScripts: number;
    totalPractices: number;
    totalReviews: number;
    weeklyScripts: number;
    weeklyPractices: number;
    avgPracticeScore: number;
  };
  pipeline: { SCRIPT: number; PRACTICE: number; REVIEW: number; CLOSED: number };
  recentSessions: PipelineSession[];
  recentPractices: Array<{ id: string; scenario: string; score: number; rounds: number; sessionId: string | null; createdAt: string }>;
}

const PIPELINE_STAGES = [
  { key: 'SCRIPT', label: '话术生成', icon: MessageSquare, color: 'bg-blue-500', textColor: 'text-blue-600' },
  { key: 'PRACTICE', label: 'AI陪练', icon: Brain, color: 'bg-purple-500', textColor: 'text-purple-600' },
  { key: 'REVIEW', label: '复盘分析', icon: FileText, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
  { key: 'CLOSED', label: '已完成', icon: TrendingUp, color: 'bg-amber-500', textColor: 'text-amber-600' },
];

export default function DashboardPage() {
  const user = useUserStore((s) => s.user);
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then((res: any) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const quickActions = [
    { icon: MessageSquare, label: '生成话术', desc: '输入场景生成专业话术', path: '/app', color: 'bg-blue-500' },
    { icon: Brain, label: 'AI陪练', desc: '模拟客户对话练习', path: '/app/practice', color: 'bg-purple-500' },
    { icon: FileText, label: '对话复盘', desc: '上传对话获取分析报告', path: '/app/review', color: 'bg-emerald-500' },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()}，{user?.name || '销售'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">今天也要加油签单</p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-primary-300 hover:shadow-md"
          >
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg text-white', action.color)}>
              <action.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{action.label}</p>
              <p className="text-xs text-gray-500">{action.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-500" />
          </button>
        ))}
      </div>

      {/* Plan & Usage */}
      {user?.plan === 'FREE' && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">免费版 · 每日限额</p>
                <p className="text-xs text-amber-600">话术 5次 · 陪练 3次 · 复盘 1次</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/app/pricing')}
              className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
            >
              升级解锁无限
            </button>
          </div>
        </Card>
      )}

      {/* Pipeline Overview */}
      {loading ? (
        <Card><Skeleton.Line className="h-20" /></Card>
      ) : data && (
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-700">销售流水线</h3>
          </div>
          <div className="flex items-center gap-2">
            {PIPELINE_STAGES.map((stage, i) => {
              const count = data.pipeline[stage.key as keyof typeof data.pipeline] || 0;
              return (
                <div key={stage.key} className="flex flex-1 items-center gap-2">
                  <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-500">{stage.label}</p>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Stats */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><Skeleton.Line className="h-16" /></Card>
          ))}
        </div>
      ) : data && (
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard icon={MessageSquare} label="话术总数" value={data.stats.totalScripts} sub={`本周 +${data.stats.weeklyScripts}`} color="text-blue-600" />
          <StatCard icon={Brain} label="陪练次数" value={data.stats.totalPractices} sub={`本周 +${data.stats.weeklyPractices}`} color="text-purple-600" />
          <StatCard icon={FileText} label="复盘报告" value={data.stats.totalReviews} sub="" color="text-emerald-600" />
          <StatCard icon={TrendingUp} label="平均得分" value={data.stats.avgPracticeScore} sub={data.stats.avgPracticeScore > 0 ? '分' : '暂无数据'} color="text-amber-600" />
        </div>
      )}

      {/* Recent Sessions with Pipeline */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">最近商机</h3>
          <button onClick={() => navigate('/app/scripts')} className="text-xs text-primary-600 hover:underline">
            查看全部
          </button>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton.Line key={i} className="h-8" />)}
          </div>
        ) : data?.recentSessions?.length ? (
          <div className="space-y-2">
            {data.recentSessions.map((s) => {
              const stageInfo = PIPELINE_STAGES.find((st) => st.key === s.stage);
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`/app/scripts?session=${s.id}`)}
                  className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-left transition-colors hover:bg-gray-100"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{s.customerName || s.name}</p>
                    <p className="text-xs text-gray-400">
                      {s.industry || '通用'} · {s._count.scripts}话术 · {s._count.practices}陪练 · {s._count.reviews}复盘
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      stageInfo?.textColor || 'text-gray-500',
                      stageInfo ? `${stageInfo.color.replace('bg-', 'bg-')}/10` : 'bg-gray-100',
                    )}>
                      {stageInfo?.label || s.stage}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-gray-400">暂无商机，去生成第一条话术吧</p>
        )}
      </Card>

      {/* Recent Practices */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">最近陪练</h3>
          <button onClick={() => navigate('/app/practice')} className="text-xs text-primary-600 hover:underline">
            查看全部
          </button>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton.Line key={i} className="h-8" />)}
          </div>
        ) : data?.recentPractices?.length ? (
          <div className="space-y-2">
            {data.recentPractices.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <div>
                  <p className="text-sm text-gray-800">{p.scenario}</p>
                  <p className="text-xs text-gray-400">{p.rounds}轮{p.sessionId ? ' · 关联商机' : ''}</p>
                </div>
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  p.score >= 80 ? 'bg-green-100 text-green-700' :
                  p.score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700',
                )}>
                  {p.score > 0 ? `${Math.round(p.score)}分` : '进行中'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-gray-400">暂无陪练记录，开始第一次练习吧</p>
        )}
      </Card>

      {/* Pro tip */}
      <Card className="border-amber-200 bg-amber-50">
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 h-5 w-5 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-800">今日小技巧</p>
            <p className="mt-1 text-sm text-amber-700">
              话术生成时，上传知识库中的产品资料，AI会基于真实信息生成更精准的话术。
              陪练时选择「销售逻辑框架」，客户会识别你的销售逻辑并做出更真实的反应。
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: number; sub: string; color: string;
}) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <Icon className={cn('h-5 w-5', color)} />
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}
