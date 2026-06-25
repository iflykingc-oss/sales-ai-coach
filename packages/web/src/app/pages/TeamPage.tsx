import { logger } from '@/utils/logger';
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import type { TeamMember, TeamTask } from '@/stores/teamStore';

export default function TeamPage() {
  const { t } = useTranslation();
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
      const teamRes = await api.get('/teams/my') as { data: { id: string; name: string } };
      const team = teamRes?.data;
      if (!team?.id) {
        setNoTeam(true);
        setLoading(false);
        return;
      }
      setTeamId(team.id);
      setNoTeam(false);

      const statsRes = await api.get(`/teams/${team.id}/stats`) as { data: { members: TeamMember[]; stats: { totalMembers: number; activeToday: number; totalScriptsGenerated: number; avgPracticeScore: number }; weakScenarios: Array<{ name: string; weakness: number }> } };
      const statsData = statsRes?.data;
      if (statsData) {
        setMembers(statsData.members || []);
        setTeamStats(statsData.stats || { totalMembers: 0, activeToday: 0, totalScriptsGenerated: 0, avgPracticeScore: 0 });
        setWeakScenarios(statsData.weakScenarios || []);
      }

      const tasksRes = await api.get(`/teams/${team.id}/tasks`) as { data: Array<Record<string, unknown>> };
      const tasks = tasksRes?.data || [];
      setTasks(tasks.map((task) => ({
        id: task.id as string,
        title: (task.title as string) || (task.type as string) || t('teamPage.task'),
        type: (task.type as TeamTask['type']) || 'practice' as const,
        assigneeId: (task.assigneeId as string) || '',
        assigneeName: (task.assigneeName as string) || '',
        deadline: task.deadline ? new Date(task.deadline as string).toISOString().split('T')[0] : '',
        status: (task.status as TeamTask['status']) || 'pending' as const,
        createdAt: task.createdAt ? new Date(task.createdAt as string).toISOString().split('T')[0] : '',
        description: (task.description as string) || '',
      })));
    } catch (err) {
      logger.error('Failed to fetch team data:', err);
      setError(t('teamPage.loadFailed'));
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
      toast.success(t('teamPage.createSuccess'));
      fetchTeamData();
    } catch (err) {
      logger.error('Failed to create team:', err);
      toast.error(t('teamPage.createFailed'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{t('teamPage.title')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('teamPage.subtitle')}</p>
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
          <h3 className="text-lg font-medium text-gray-900">{t('teamPage.noTeamTitle')}</h3>
          <p className="mt-2 text-sm text-gray-500">{t('teamPage.noTeamDesc')}</p>
          <button
            onClick={() => setShowCreateTeam(true)}
            className="mt-4 rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            {t('teamPage.createTeam')}
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
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('teamPage.createTeamTitle')}</h3>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder={t('teamPage.teamNamePlaceholder')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setShowCreateTeam(false); setTeamName(''); }}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={!teamName.trim()}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {t('teamPage.create')}
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
