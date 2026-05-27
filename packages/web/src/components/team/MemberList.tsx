import { useTeamStore, type TeamMember } from '@/stores/teamStore';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Users } from 'lucide-react';
import { cn } from '@/utils/cn';

const statusColors: Record<TeamMember['status'], string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  offline: 'bg-gray-400',
};

const roleLabels: Record<TeamMember['role'], string> = {
  TEAM_OWNER: '团队长',
  ADMIN: '管理员',
  USER: '成员',
};

const roleVariants: Record<TeamMember['role'], 'default' | 'info' | 'warning'> = {
  TEAM_OWNER: 'warning',
  ADMIN: 'info',
  USER: 'default',
};

export function MemberList() {
  const { members } = useTeamStore();

  if (members.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-6 w-6" />}
        title="暂无成员"
        description="邀请团队成员加入后，此处将展示成员列表"
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h3 className="text-base font-semibold text-gray-900">团队成员</h3>
        <p className="mt-1 text-sm text-gray-500">共 {members.length} 名成员</p>
      </div>
      <div className="divide-y divide-gray-100">
        {members.map((member) => (
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
