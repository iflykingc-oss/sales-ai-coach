import { useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { AdminStats } from '@/components/admin/AdminStats';
import { KnowledgeAdmin } from '@/components/admin/KnowledgeAdmin';
import { ModelConfig } from '@/components/admin/ModelConfig';
import { PluginAdmin } from '@/components/admin/PluginAdmin';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { useAdminStore, type AdminTab } from '@/stores/adminStore';
import { useUserStore } from '@/stores/userStore';

export default function AdminPage() {
  const { activeTab, setActiveTab, loading, setLoading } = useAdminStore();
  const user = useUserStore((s) => s.user);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [setLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="mt-4 text-sm text-gray-500">加载管理后台...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm text-gray-500">管理后台仅对管理员开放</p>
        <p className="mt-2 text-xs text-gray-400">请联系管理员获取权限</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">管理员后台</h2>
        <p className="mt-1 text-sm text-gray-500">
          数据统计、知识库管理、模型配置、插件管理和系统设置
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AdminTab)}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="stats">数据统计</TabsTrigger>
          <TabsTrigger value="knowledge">知识库管理</TabsTrigger>
          <TabsTrigger value="models">模型配置</TabsTrigger>
          <TabsTrigger value="plugins">插件包管理</TabsTrigger>
          <TabsTrigger value="settings">系统设置</TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <AdminStats />
        </TabsContent>

        <TabsContent value="knowledge">
          <KnowledgeAdmin />
        </TabsContent>

        <TabsContent value="models">
          <ModelConfig />
        </TabsContent>

        <TabsContent value="plugins">
          <PluginAdmin />
        </TabsContent>

        <TabsContent value="settings">
          <SystemSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
