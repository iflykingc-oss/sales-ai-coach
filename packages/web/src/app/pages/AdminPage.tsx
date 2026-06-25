import { logger } from '@/utils/logger';
import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminStats } from '@/components/admin/AdminStats';
import { KnowledgeAdmin } from '@/components/admin/KnowledgeAdmin';
import { ModelConfig } from '@/components/admin/ModelConfig';
import { PluginAdmin } from '@/components/admin/PluginAdmin';
import { AnnouncementAdmin } from '@/components/admin/AnnouncementAdmin';
import { SyncManager } from '@/components/admin/SyncManager';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { UserAdmin } from '@/components/admin/UserAdmin';
import { RetrievalLogs } from '@/components/admin/RetrievalLogs';
import { PlanConfig } from '@/components/admin/PlanConfig';
import { useAdminStore, type AdminTab, type KnowledgeItem } from '@/stores/adminStore';
import { useUserStore } from '@/stores/userStore';
import { api } from '@/services/api';
import { toast } from '@/hooks/useToast';

export default function AdminPage() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab, loading, setLoading, setStats, setModels, setSystemUsers, setKnowledgeItems } = useAdminStore();
  const user = useUserStore((s) => s.user);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, modelsRes, knowledgeRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/models'),
        api.get('/knowledge'),
      ]);
      const stats = statsRes.data;
      setStats({
        totalUsers: stats.totalUsers,
        dailyActiveUsers: stats.dailyActiveUsers,
        totalScriptsGenerated: stats.totalScriptsGenerated,
        dailyScriptsGenerated: stats.dailyScriptsGenerated,
        modelUsage: stats.modelUsage || [],
        userGrowthTrend: stats.userGrowthTrend || [],
        scriptUsageTrend: stats.scriptUsageTrend || [],
        topIndustries: stats.topIndustries || [],
      });
      setSystemUsers(usersRes.data || []);
      setModels(modelsRes.data || []);
      // Load knowledge items from database
      const knowledgeData = knowledgeRes.data || knowledgeRes || [];
      setKnowledgeItems(Array.isArray(knowledgeData) ? knowledgeData.map((k: Record<string, unknown>) => ({
        id: k.id as string,
        title: (k.title as string) || (k.content as string)?.slice(0, 50) || t('adminPage.unnamed'),
        category: (k.category as string) || (k.industry as string) || t('adminPage.other'),
        source: (k.source as string) || 'manual',
        status: (k.status as KnowledgeItem['status']) || 'approved' as const,
        createdAt: (k.createdAt as string) || (k.created_at as string) || new Date().toISOString(),
        content: k.content as string | undefined,
      })) : []);
    } catch (e) {
      logger.error('Failed to fetch admin data:', e);
      toast.error(t('adminPage.loadFailed'), { description: t('adminPage.loadFailedDesc') });
    } finally {
      setLoading(false);
    }
  }, [setLoading, setStats, setSystemUsers, setModels, setKnowledgeItems]);

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'TEAM_OWNER') {
      fetchData();
    }
  }, [user, fetchData]);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'TEAM_OWNER';

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm text-gray-500">{t('adminPage.accessDenied')}</p>
        <p className="mt-2 text-xs text-gray-400">{t('adminPage.accessDeniedDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{t('adminPage.title')}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {t('adminPage.subtitle')}
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {/* Tabs skeleton */}
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24" />
            ))}
          </div>
          {/* Content skeleton */}
          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                  <Skeleton className="mb-2 h-4 w-20" />
                  <Skeleton className="h-7 w-14" />
                </div>
              ))}
            </div>
          )}
          {activeTab === 'knowledge' && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
                  <Skeleton className="mb-2 h-4 w-40" />
                  <Skeleton className="mb-2 h-3 flex-1" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          )}
          {activeTab === 'models' && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
                  <Skeleton className="mb-2 h-4 w-32" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          )}
          {activeTab === 'plugins' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
                  <Skeleton className="mb-2 h-4 w-32" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 flex-1" />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AdminTab)}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="stats">{t('adminPage.tabs.stats')}</TabsTrigger>
            <TabsTrigger value="users">{t('adminPage.tabs.users')}</TabsTrigger>
            <TabsTrigger value="knowledge">{t('adminPage.tabs.knowledge')}</TabsTrigger>
            <TabsTrigger value="plans">{t('adminPage.tabs.plans')}</TabsTrigger>
            <TabsTrigger value="models">{t('adminPage.tabs.models')}</TabsTrigger>
            <TabsTrigger value="announcements">{t('adminPage.tabs.announcements')}</TabsTrigger>
            <TabsTrigger value="sync">{t('adminPage.tabs.sync')}</TabsTrigger>
            <TabsTrigger value="plugins">{t('adminPage.tabs.plugins')}</TabsTrigger>
            <TabsTrigger value="settings">{t('adminPage.tabs.settings')}</TabsTrigger>
            <TabsTrigger value="retrieval-logs">{t('adminPage.tabs.retrievalLogs')}</TabsTrigger>
          </TabsList>

          <TabsContent value="stats">
            <AdminStats />
          </TabsContent>

          <TabsContent value="users">
            <UserAdmin />
          </TabsContent>

          <TabsContent value="knowledge">
            <KnowledgeAdmin />
          </TabsContent>

          <TabsContent value="plans">
            <PlanConfig />
          </TabsContent>

          <TabsContent value="models">
            <ModelConfig />
          </TabsContent>

          <TabsContent value="announcements">
            <AnnouncementAdmin />
          </TabsContent>

          <TabsContent value="sync">
            <SyncManager />
          </TabsContent>

          <TabsContent value="plugins">
            <PluginAdmin />
          </TabsContent>

          <TabsContent value="settings">
            <SystemSettings />
          </TabsContent>

          <TabsContent value="retrieval-logs">
            <RetrievalLogs />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
