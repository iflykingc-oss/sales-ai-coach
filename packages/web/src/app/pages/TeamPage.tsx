import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { TeamDashboard } from '@/components/team/TeamDashboard';
import { MemberList } from '@/components/team/MemberList';
import { TaskManager } from '@/components/team/TaskManager';
import { ScriptSharing } from '@/components/team/ScriptSharing';
import { CreateMemberDialog } from '@/components/team/CreateMemberDialog';
import { useTeamStore } from '@/stores/teamStore';
import { useUserStore } from '@/stores/userStore';
import { api } from '@/services/api';

export default function TeamPage() {
  const { loading, setLoading, setMembers, setTasks, setTeamStats, setWeakScenarios } = useTeamStore();
  const user = useUserStore((s) => s.user);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [noTeam, setNoTeam] = useState(false);
  const [showCreateMember, setShowCreateMember] = useState(false);

  const fetchTeamData = useCallback(async () => {
    setLoading(true);
    try {
      // Get user's team
      const teamRes = await api.get('/teams/my') as any;
      const team = teamRes?.data;
      if (!team?.id) {
        setNoTeam(true);
        setLoading(false);
        return;
      }
      setTeamId(team.id);
      setNoTeam(false);

      // Fetch dashboard stats
      const statsRes = await api.get(`/teams/${team.id}/stats`) as any;
      const statsData = statsRes?.data;
      if (statsData) {
        setMembers(statsData.members || []);
        setTeamStats(statsData.stats || { totalMembers: 0, activeToday: 0, totalScriptsGenerated: 0, avgPracticeScore: 0 });
        setWeakScenarios(statsData.weakScenarios || []);
      }

      // Fetch tasks
      const tasksRes = await api.get(`/teams/${team.id}/tasks`) as any;
      const tasks = tasksRes?.data || [];
      setTasks(tasks.map((t: any) => ({
        id: t.id,
        title: t.title || t.type || '任务',
        type: t.type || 'practice',
        assigneeId: t.assigneeId || '',
        assigneeName: t.assigneeName || '',
        deadline: t.deadline ? new Date(t.deadline).toISOString().split('T')[0] : '',
        status: t.status || 'pending',
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : '',
        description: t.description || '',
      })));
    } catch (err) {
      console.error('Failed to fetch team data:', err);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setMembers, setTasks, setTeamStats, setWeakScenarios]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const isOwner = user?.role === 'TEAM_OWNER' || user?.role === 'ADMIN';

  const handleCreateTeam = async () => {
    const name = prompt('请输入团队名称:');
    if (!name?.trim()) return;
    try {
      await api.post('/teams', { name: name.trim() });
      fetchTeamData();
    } catch (err) {
      console.error('Failed to create team:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">团队管理</h2>
        <p className="mt-1 text-sm text-gray-500">
          管理团队数据看板、任务分配和话术共享
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                <Skeleton className="mb-2 h-4 w-20" />
                <Skeleton className="h-7 w-12" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-6">
                <Skeleton className="mb-4 h-5 w-32" />
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="flex gap-2">
                      <Skeleton className="h-3 flex-1" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : noTeam ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">还没有加入团队</h3>
          <p className="mt-2 text-sm text-gray-500">创建一个团队，邀请成员一起训练</p>
          <button
            onClick={handleCreateTeam}
            className="mt-4 rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            创建团队
          </button>
        </div>
      ) : isOwner ? (
        <>
          <TeamDashboard />
          <MemberList onCreateMember={() => setShowCreateMember(true)} />
          <TaskManager teamId={teamId} />
          <ScriptSharing />
        </>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-500">团队管理功能仅对团队管理员开放</p>
          <p className="mt-2 text-xs text-gray-400">请联系团队管理员获取权限</p>
        </div>
      )}

      {/* 创建成员对话框 */}
      {teamId && (
        <CreateMemberDialog
          open={showCreateMember}
          onOpenChange={setShowCreateMember}
          teamId={teamId}
          onSuccess={fetchTeamData}
        />
      )}
    </div>
  );
}
