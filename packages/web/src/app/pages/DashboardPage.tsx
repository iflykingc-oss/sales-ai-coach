import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Brain, FileText, TrendingUp, ArrowRight, Zap } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useUserStore } from '@/stores/userStore';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

interface DashboardData {
  stats: {
    totalScripts: number;
    totalPractices: number;
    totalReviews: number;
    weeklyScripts: number;
    weeklyPractices: number;
    avgPracticeScore: number;
  };
  recentScripts: Array<{ id: string; style: string; industry: string | null; createdAt: string }>;
  recentPractices: Array<{ id: string; scenario: string; score: number; rounds: number; createdAt: string }>;
}

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

      {/* Recent Activity */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Recent Scripts */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">最近话术</h3>
            <button onClick={() => navigate('/app')} className="text-xs text-primary-600 hover:underline">
              查看全部
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton.Line key={i} className="h-8" />)}
            </div>
          ) : data?.recentScripts.length ? (
            <div className="space-y-2">
              {data.recentScripts.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <div>
                    <p className="text-sm text-gray-800">{s.style || '话术'}</p>
                    <p className="text-xs text-gray-400">{s.industry || '通用'}</p>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(s.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-gray-400">暂无话术，去生成第一条吧</p>
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
          ) : data?.recentPractices.length ? (
            <div className="space-y-2">
              {data.recentPractices.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <div>
                    <p className="text-sm text-gray-800">{p.scenario}</p>
                    <p className="text-xs text-gray-400">{p.rounds}轮</p>
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
      </div>

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

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return '今天';
  if (diff < 172800000) return '昨天';
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
