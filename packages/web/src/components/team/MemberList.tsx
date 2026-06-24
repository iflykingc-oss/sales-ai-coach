import { useTeamStore, type TeamMember } from '@/stores/teamStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Users, UserPlus, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';
import { toast } from '@/hooks/useToast';

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

interface MemberListProps {
  onCreateMember?: () => void;
}

export function MemberList({ onCreateMember }: MemberListProps) {
  const { members } = useTeamStore();

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`确定要移除成员 ${memberName} 吗？`)) return;

    try {
      const teamRes = await api.get('/teams/my') as any;
      const teamId = teamRes?.data?.id;
      if (!teamId) return;

      await api.delete(`/teams/${teamId}/members/${memberId}`);
      toast.success('成员已移除');
      // 刷新页面
      window.location.reload();
    } catch (err) {
      toast.error('移除失败');
    }
  };

  if (members.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-6 w-6" />}
        title="暂无成员"
        description="点击上方按钮添加团队成员"
        action={onCreateMember ? { label: '添加成员', onClick: onCreateMember } : undefined}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">团队成员</h3>
          <p className="mt-1 text-sm text-gray-500">共 {members.length} 名成员</p>
        </div>
        {onCreateMember && (
          <Button size="sm" onClick={onCreateMember}>
            <UserPlus className="mr-1.5 h-4 w-4" />
            添加成员
          </Button>
        )}
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
              <span className="text-xs text-gray-400">{member.stats.scriptsGenerated}个话术</span>
              <span className="text-xs text-gray-400">{member.stats.practicesCompleted}次练习</span>
              <Badge variant={roleVariants[member.role]}>{roleLabels[member.role]}</Badge>
              {member.role !== 'TEAM_OWNER' && (
                <button
                  onClick={() => handleRemoveMember(member.id, member.name)}
                  className="ml-2 text-gray-400 hover:text-red-500"
                  title="移除成员"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
