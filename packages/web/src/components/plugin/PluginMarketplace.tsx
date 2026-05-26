import { useMemo, useState, useEffect } from 'react';
import { Search, Package } from 'lucide-react';
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

type SortKey = 'default' | 'rating' | 'installs';

export function PluginMarketplace() {
  const { plugins, fetchPlugins, categoryFilter, setCategoryFilter, setSelectedPlugin } = usePluginStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('default');

  useEffect(() => {
    fetchPlugins();
  }, []);

  // Merge real definitions with store state (installed/active)
  const displayPlugins = useMemo(() => {
    const base = industryDefinitions.map(toPlugin);
    if (plugins.length === 0) return base;
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
    let result = displayPlugins;
    if (categoryFilter !== 'all') {
      result = result.filter((p) => p.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }
    if (sortBy === 'rating') {
      result = [...result].sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'installs') {
      result = [...result].sort((a, b) => b.installCount - a.installCount);
    }
    return result;
  }, [displayPlugins, categoryFilter, searchQuery, sortBy]);

  return (
    <div>
      {/* Search and Sort Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:flex-none sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索插件包..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="default">默认排序</option>
          <option value="rating">评分最高</option>
          <option value="installs">安装最多</option>
        </select>
      </div>

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
          title="未找到匹配的插件"
          description="尝试调整搜索词或切换分类"
          className="py-12"
        />
      )}
    </div>
  );
}
