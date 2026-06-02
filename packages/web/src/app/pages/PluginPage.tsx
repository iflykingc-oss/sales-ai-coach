import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { PluginMarketplace } from '@/components/plugin/PluginMarketplace';
import { InstalledPlugins } from '@/components/plugin/InstalledPlugins';
import { PluginDetail } from '@/components/plugin/PluginDetail';
import { usePluginStore } from '@/stores/pluginStore';
import { cn } from '@/utils/cn';

export default function PluginPage() {
  const { loading, selectedPlugin, setSelectedPlugin } = usePluginStore();
  const [activeView, setActiveView] = useState<'marketplace' | 'installed'>('marketplace');

  useEffect(() => {
    usePluginStore.getState().fetchPlugins();
  }, []);

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
      ) : loading ? (
        <div className="space-y-6">
          {/* Toggle skeleton */}
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
          {/* Plugin grid skeleton */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="mb-2 h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="mt-3 h-3 flex-1" />
                <Skeleton className="mt-2 h-3 w-2/3" />
                <div className="mt-3 flex gap-3">
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="mt-4 h-8 w-full" />
              </div>
            ))}
          </div>
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
              aria-pressed={activeView === 'marketplace'}
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
              aria-pressed={activeView === 'installed'}
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
