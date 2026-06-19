import { Users, Activity, Target, Zap } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/MiniChart';
import { useTeamStore } from '@/stores/teamStore';

const colorMap: Record<number, string> = {
  0: '#ef4444',
  1: '#f97316',
  2: '#eab308',
  3: '#84cc16',
  4: '#22c55e',
  5: '#06b6d4',
};

export function TeamDashboard() {
  const { teamStats, weakScenarios, members } = useTeamStore();

  const hasData = teamStats.totalMembers > 0;
  const maxWeakness = weakScenarios.length > 0 ? Math.max(...weakScenarios.map((s) => s.weakness)) : 100;

  if (!hasData) {
    return (
      <EmptyState
        icon={<Users className="h-6 w-6" />}
        title="暂无团队数据"
        description="团队成员加入后，此处将展示团队成单能力数据"
        className="py-20"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards - 成单导向 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="团队成员"
          value={teamStats.totalMembers}
          icon={<Users className="h-5 w-5" />}
          trend={{ value: 8, label: '较上月' }}
        />
        <StatCard
          title="今日活跃"
          value={teamStats.activeToday}
          icon={<Activity className="h-5 w-5" />}
          trend={{ value: 12, label: '较昨日' }}
        />
        <StatCard
          title="话术使用"
          value={teamStats.totalScriptsGenerated}
          icon={<Zap className="h-5 w-5" />}
          trend={{ value: 23, label: '较上周' }}
        />
        <StatCard
          title="团队成单概率"
          value={`${teamStats.avgPracticeScore}%`}
          icon={<Target className="h-5 w-5" />}
          trend={{ value: 5, label: '较上周' }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Team Weak Scenarios - 成单薄弱环节 */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900">成单薄弱环节</h3>
          <p className="mb-3 text-xs text-gray-500">这些场景的成单概率较低，建议针对性练习</p>
          <div className="space-y-3">
            {weakScenarios.map((scenario, index) => (
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

        {/* Member Growth Trends - 成单能力排名 */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900">成单能力排名</h3>
          <p className="mb-3 text-xs text-gray-500">基于练习数据的成单概率排名</p>
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
