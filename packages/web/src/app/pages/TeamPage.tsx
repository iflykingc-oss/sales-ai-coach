import { useEffect } from 'react';
import { TeamDashboard } from '@/components/team/TeamDashboard';
import { MemberList } from '@/components/team/MemberList';
import { TaskManager } from '@/components/team/TaskManager';
import { ScriptSharing } from '@/components/team/ScriptSharing';
import { useTeamStore } from '@/stores/teamStore';
import { useUserStore } from '@/stores/userStore';

export default function TeamPage() {
  const { loading, setLoading } = useTeamStore();
  const user = useUserStore((s) => s.user);

  useEffect(() => {
    // Simulate loading team data from API
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [setLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="mt-4 text-sm text-gray-500">加载团队数据...</p>
        </div>
      </div>
    );
  }

  const isOwner = user?.role === 'owner' || user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">团队管理</h2>
        <p className="mt-1 text-sm text-gray-500">
          管理团队数据看板、任务分配和话术共享
        </p>
      </div>

      {isOwner ? (
        <>
          <TeamDashboard />
          <MemberList />
          <TaskManager />
          <ScriptSharing />
        </>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-500">团队管理功能仅对团队管理员开放</p>
          <p className="mt-2 text-xs text-gray-400">请联系团队管理员获取权限</p>
        </div>
      )}
    </div>
  );
}
