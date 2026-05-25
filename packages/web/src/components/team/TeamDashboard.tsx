import { Users, Activity, FileText, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/MiniChart';
import { useTeamStore, type TeamScenario } from '@/stores/teamStore';

const mockTeamStats = {
  totalMembers: 12,
  activeToday: 8,
  totalScriptsGenerated: 347,
  avgPracticeScore: 82,
};

const mockWeakScenarios: TeamScenario[] = [
  { name: '价格异议', weakness: 78 },
  { name: '竞品对比', weakness: 65 },
  { name: '需求挖掘', weakness: 52 },
  { name: '异议处理', weakness: 45 },
  { name: '关单技巧', weakness: 38 },
  { name: '开场白', weakness: 25 },
];

const colorMap: Record<number, string> = {
  0: '#ef4444',
  1: '#f97316',
  2: '#eab308',
  3: '#84cc16',
  4: '#22c55e',
  5: '#06b6d4',
};

export function TeamDashboard() {
  const { teamStats, weakScenarios, setTeamStats, setWeakScenarios, members } = useTeamStore();

  // Use mock data if store is empty (simulating API response)
  const stats = teamStats.totalMembers > 0 ? teamStats : mockTeamStats;
  const scenarios = weakScenarios.length > 0 ? weakScenarios : mockWeakScenarios;

  // Populate store if empty
  if (teamStats.totalMembers === 0) {
    setTeamStats(mockTeamStats);
    setWeakScenarios(mockWeakScenarios);
  }

  const maxWeakness = Math.max(...scenarios.map((s) => s.weakness));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="团队成员"
          value={stats.totalMembers}
          icon={<Users className="h-5 w-5" />}
          trend={{ value: 8, label: '较上月' }}
        />
        <StatCard
          title="今日活跃"
          value={stats.activeToday}
          icon={<Activity className="h-5 w-5" />}
          trend={{ value: 12, label: '较昨日' }}
        />
        <StatCard
          title="话术生成"
          value={stats.totalScriptsGenerated}
          icon={<FileText className="h-5 w-5" />}
          trend={{ value: 23, label: '较上周' }}
        />
        <StatCard
          title="平均陪练分数"
          value={`${stats.avgPracticeScore}`}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={{ value: 5, label: '较上周' }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Team Weak Scenarios */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900">团队薄弱场景</h3>
          <div className="space-y-3">
            {scenarios.map((scenario, index) => (
              <div key={scenario.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{scenario.name}</span>
                  <span className="font-medium" style={{ color: colorMap[index] ?? '#6366f1' }}>
                    {scenario.weakness}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${(scenario.weakness / maxWeakness) * 100}%`,
                      backgroundColor: colorMap[index] ?? '#6366f1',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Member Growth Trends */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900">成员成长趋势</h3>
          <div className="space-y-3">
            {members.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
                    {member.name.charAt(0)}
                  </div>
                  <span className="text-sm text-gray-700">{member.name}</span>
                </div>
                {member.stats.growthTrend.length > 1 && (
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {member.stats.practiceScore}分
                    </span>
                  </div>
                )}
              </div>
            ))}
            {members.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">暂无成员数据</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
