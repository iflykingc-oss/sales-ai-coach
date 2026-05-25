import { useState, useEffect } from 'react';
import { PluginMarketplace } from '@/components/plugin/PluginMarketplace';
import { InstalledPlugins } from '@/components/plugin/InstalledPlugins';
import { PluginDetail } from '@/components/plugin/PluginDetail';
import { usePluginStore } from '@/stores/pluginStore';
import { cn } from '@/utils/cn';

export default function PluginPage() {
  const { loading, setLoading, selectedPlugin, setSelectedPlugin } = usePluginStore();
  const [activeView, setActiveView] = useState<'marketplace' | 'installed'>('marketplace');

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
          <p className="mt-4 text-sm text-gray-500">加载插件数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">行业插件</h2>
        <p className="mt-1 text-sm text-gray-500">
          浏览和安装行业插件包，一键切换适配不同销售场景
        </p>
      </div>

      {/* Plugin Detail View */}
      {selectedPlugin ? (
        <div>
          <PluginDetail
            plugin={selectedPlugin}
            onClose={() => setSelectedPlugin(null)}
          />
        </div>
      ) : (
        <>
          {/* View Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveView('marketplace')}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                activeView === 'marketplace'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              插件市场
            </button>
            <button
              type="button"
              onClick={() => setActiveView('installed')}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                activeView === 'installed'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              已安装
            </button>
          </div>

          {activeView === 'marketplace' ? (
            <PluginMarketplace />
          ) : (
            <InstalledPlugins />
          )}
        </>
      )}
    </div>
  );
}
