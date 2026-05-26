import { useMemo } from 'react';
import { Package } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePluginStore, type Plugin } from '@/stores/pluginStore';
import { industryDefinitions } from '@/data/pluginContent';
import { PluginCard } from './PluginCard';
import { cn } from '@/utils/cn';

function toPlugin(def: typeof industryDefinitions[0]): Plugin {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    icon: def.icon,
    category: def.category,
    installCount: def.installCount,
    installed: false,
    active: false,
    scriptCount: def.scriptCount,
    scenarioCount: def.scenarioCount,
    lastUpdated: def.lastUpdated,
    version: def.version,
    rating: def.rating,
    reviewCount: def.reviewCount,
  };
}

export function PluginMarketplace() {
  const { plugins, categoryFilter, setCategoryFilter, setSelectedPlugin } = usePluginStore();

  // Merge real definitions with store state (installed/active)
  const displayPlugins = useMemo(() => {
    const base = industryDefinitions.map(toPlugin);
    if (plugins.length === 0) return base;
    // Overlay store state for installed/active
    const storeMap = new Map(plugins.map((p) => [p.id, p]));
    return base.map((p) => {
      const stored = storeMap.get(p.id);
      if (stored) {
        p.installed = stored.installed;
        p.active = stored.active;
      }
      return p;
    });
  }, [plugins]);

  const filteredPlugins = useMemo(() => {
    if (categoryFilter === 'all') return displayPlugins;
    return displayPlugins.filter((p) => p.category === categoryFilter);
  }, [displayPlugins, categoryFilter]);

  return (
    <div>
      {/* Category Filter */}
      <div className="mb-6 flex gap-2">
        {([
          { key: 'all', label: '全部行业' },
          { key: 'domestic', label: '国内行业' },
          { key: 'overseas', label: '海外行业' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setCategoryFilter(key)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              categoryFilter === key
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Plugin Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredPlugins.map((plugin) => (
          <PluginCard key={plugin.id} plugin={plugin} onDetail={(p) => setSelectedPlugin(p)} />
        ))}
      </div>

      {filteredPlugins.length === 0 && (
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title="该分类下暂无插件"
          description="切换其他分类查看行业插件包"
          className="py-12"
        />
      )}
    </div>
  );
}
