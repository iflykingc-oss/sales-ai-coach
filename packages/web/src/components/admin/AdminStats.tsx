import { Users, Activity, FileText, Cpu, TrendingUp, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/Badge';
import { StatCard, Sparkline, MiniBarChart } from '@/components/ui/MiniChart';
import { useAdminStore, type AdminStats } from '@/stores/adminStore';

const mockStats: AdminStats = {
  totalUsers: 1286,
  dailyActiveUsers: 342,
  totalScriptsGenerated: 15890,
  dailyScriptsGenerated: 128,
  modelUsage: [
    { name: 'Qwen-Max', calls: 8420, percentage: 42 },
    { name: 'GPT-4o', calls: 5230, percentage: 26 },
    { name: 'Claude', calls: 3650, percentage: 18 },
    { name: 'Minimax', calls: 2590, percentage: 14 },
  ],
  userGrowthTrend: [180, 220, 280, 350, 420, 510, 620, 740, 860, 980, 1100, 1286],
  scriptUsageTrend: [800, 950, 1100, 1300, 1450, 1600, 1800, 2000, 2200, 2500, 2800, 3100],
  topIndustries: [
    { name: 'SaaS软件', count: 320 },
    { name: '医疗器械', count: 245 },
    { name: '金融', count: 198 },
    { name: '教育', count: 156 },
    { name: '房地产', count: 128 },
    { name: '电商', count: 95 },
  ],
};

const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export function AdminStats() {
  const { stats, setStats } = useAdminStore();

  const displayStats = stats ?? mockStats;
  if (!stats) setStats(mockStats);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="总用户数"
          value={displayStats.totalUsers.toLocaleString()}
          icon={<Users className="h-5 w-5" />}
          trend={{ value: 15, label: '较上月' }}
        />
        <StatCard
          title="日活跃用户"
          value={displayStats.dailyActiveUsers}
          icon={<Activity className="h-5 w-5" />}
          trend={{ value: 8, label: '较昨日' }}
        />
        <StatCard
          title="话术生成总数"
          value={displayStats.totalScriptsGenerated.toLocaleString()}
          icon={<FileText className="h-5 w-5" />}
          trend={{ value: 22, label: '较上月' }}
        />
        <StatCard
          title="今日话术生成"
          value={displayStats.dailyScriptsGenerated}
          icon={<Cpu className="h-5 w-5" />}
          trend={{ value: 5, label: '较昨日' }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* User Growth */}
        <Card>
          <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-gray-900">
            <TrendingUp className="h-4 w-4 text-primary-600" />
            用户增长趋势
          </h3>
          <div className="mt-4">
            <Sparkline
              data={displayStats.userGrowthTrend}
              width={500}
              height={80}
              color="#6366f1"
            />
            <div className="mt-2 flex justify-between text-xs text-gray-400">
              {months.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        </Card>

        {/* Script Usage */}
        <Card>
          <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-gray-900">
            <BarChart3 className="h-4 w-4 text-primary-600" />
            话术使用量趋势
          </h3>
          <div className="mt-4">
            <Sparkline
              data={displayStats.scriptUsageTrend}
              width={500}
              height={80}
              color="#22c55e"
            />
            <div className="mt-2 flex justify-between text-xs text-gray-400">
              {months.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Model Usage & Top Industries */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Model Usage */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900">模型使用分布</h3>
          <div className="space-y-3">
            {displayStats.modelUsage.map((model) => (
              <div key={model.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{model.name}</span>
                  <span className="text-gray-500">
                    {model.calls.toLocaleString()} 次 ({model.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-primary-500 transition-all duration-500"
                    style={{ width: `${model.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Industries */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900">行业采用排行</h3>
          <MiniBarChart
            data={displayStats.topIndustries.map((ind) => ({
              label: ind.name,
              value: ind.count,
            }))}
            width={400}
            height={120}
          />
        </Card>
      </div>
    </div>
  );
}
