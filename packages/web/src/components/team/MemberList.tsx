import { useTeamStore, type TeamMember } from '@/stores/teamStore';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';

const mockMembers: TeamMember[] = [
  {
    id: '1', name: '张伟', email: 'zhangwei@example.com', role: 'owner', status: 'online',
    joinedAt: '2025-01-15',
    stats: { scriptsGenerated: 45, practiceScore: 88, sessionsCompleted: 32, growthTrend: [65, 70, 72, 78, 82, 85, 88] },
  },
  {
    id: '2', name: '李娜', email: 'lina@example.com', role: 'admin', status: 'online',
    joinedAt: '2025-02-01',
    stats: { scriptsGenerated: 38, practiceScore: 92, sessionsCompleted: 28, growthTrend: [70, 75, 78, 82, 85, 88, 92] },
  },
  {
    id: '3', name: '王芳', email: 'wangfang@example.com', role: 'member', status: 'away',
    joinedAt: '2025-02-10',
    stats: { scriptsGenerated: 22, practiceScore: 75, sessionsCompleted: 18, growthTrend: [60, 62, 65, 68, 70, 72, 75] },
  },
  {
    id: '4', name: '刘洋', email: 'liuyang@example.com', role: 'member', status: 'online',
    joinedAt: '2025-03-01',
    stats: { scriptsGenerated: 15, practiceScore: 68, sessionsCompleted: 12, growthTrend: [50, 55, 58, 60, 62, 65, 68] },
  },
  {
    id: '5', name: '陈静', email: 'chenjing@example.com', role: 'member', status: 'offline',
    joinedAt: '2025-03-15',
    stats: { scriptsGenerated: 10, practiceScore: 82, sessionsCompleted: 8, growthTrend: [70, 72, 74, 76, 78, 80, 82] },
  },
];

const statusColors: Record<TeamMember['status'], string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  offline: 'bg-gray-400',
};

const roleLabels: Record<TeamMember['role'], string> = {
  owner: '团队长',
  admin: '管理员',
  member: '成员',
};

const roleVariants: Record<TeamMember['role'], 'default' | 'info' | 'warning'> = {
  owner: 'warning',
  admin: 'info',
  member: 'default',
};

export function MemberList() {
  const { members, setMembers } = useTeamStore();

  if (members.length === 0) {
    setMembers(mockMembers);
  }

  const displayMembers = members.length > 0 ? members : mockMembers;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h3 className="text-base font-semibold text-gray-900">团队成员</h3>
        <p className="mt-1 text-sm text-gray-500">共 {displayMembers.length} 名成员</p>
      </div>
      <div className="divide-y divide-gray-100">
        {displayMembers.map((member) => (
          <div key={member.id} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-medium text-white">
                  {member.name.charAt(0)}
                </div>
                <span className={cn('absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white', statusColors[member.status])} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{member.name}</p>
                <p className="text-xs text-gray-500">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{member.stats.sessionsCompleted}次陪练</span>
              <Badge variant={roleVariants[member.role]}>{roleLabels[member.role]}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
