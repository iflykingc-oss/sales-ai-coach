import { logger } from '@/utils/logger';
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
import { toast } from '@/hooks/useToast';
import { AlertCircle } from 'lucide-react';

export default function TeamPage() {
  const { loading, setLoading, setMembers, setTasks, setTeamStats, setWeakScenarios } = useTeamStore();
  const user = useUserStore((s) => s.user);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [noTeam, setNoTeam] = useState(false);
  const [showCreateMember, setShowCreateMember] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchTeamData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const teamRes: any = await api.get('/teams/my');
      const team = teamRes?.data;
      if (!team?.id) {
        setNoTeam(true);
        setLoading(false);
        return;
      }
      setTeamId(team.id);
      setNoTeam(false);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statsRes: any = await api.get(`/teams/${team.id}/stats`);
      const statsData = statsRes?.data;
      if (statsData) {
        setMembers(statsData.members || []);
        setTeamStats(statsData.stats || { totalMembers: 0, activeToday: 0, totalScriptsGenerated: 0, avgPracticeScore: 0 });
        setWeakScenarios(statsData.weakScenarios || []);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tasksRes: any = await api.get(`/teams/${team.id}/tasks`);
      const tasks = tasksRes?.data || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      logger.error('Failed to fetch team data:', err);
      setError('加载团队数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setMembers, setTasks, setTeamStats, setWeakScenarios]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const isOwner = user?.role === 'TEAM_OWNER' || user?.role === 'ADMIN';

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    try {
      await api.post('/teams', { name: teamName.trim() });
      setShowCreateTeam(false);
      setTeamName('');
      toast.success('团队创建成功');
      fetchTeamData();
    } catch (err) {
      logger.error('Failed to create team:', err);
      toast.error('创建团队失败');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">团队管理</h2>
        <p className="mt-1 text-sm text-gray-500">管理团队数据看板、任务分配和话术共享</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

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
        </div>
      ) : noTeam ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">还没有加入团队</h3>
          <p className="mt-2 text-sm text-gray-500">创建一个团队，邀请成员一起训练</p>
          <button
            onClick={() => setShowCreateTeam(true)}
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
        <div className="space-y-6">
          <TeamDashboard />
          <ScriptSharing />
        </div>
      )}

      {/* Create team dialog */}
      {showCreateTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">创建团队</h3>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="请输入团队名称"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setShowCreateTeam(false); setTeamName(''); }}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={!teamName.trim()}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

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
