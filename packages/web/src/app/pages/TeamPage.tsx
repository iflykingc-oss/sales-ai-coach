import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
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
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [setLoading]);

  const isOwner = user?.role === 'owner' || user?.role === 'admin';

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
          {/* Stats cards skeleton */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                <Skeleton className="mb-2 h-4 w-20" />
                <Skeleton className="h-7 w-12" />
              </div>
            ))}
          </div>
          {/* Charts skeleton */}
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
          {/* Member table skeleton */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <Skeleton className="mb-4 h-5 w-24" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>
          {/* Tasks skeleton */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <Skeleton className="mb-4 h-5 w-24" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : isOwner ? (
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
