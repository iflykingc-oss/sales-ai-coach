import { useMemo } from 'react';
import { Package } from 'lucide-react';
import { usePluginStore, type Plugin } from '@/stores/pluginStore';
import { PluginCard } from './PluginCard';
import { cn } from '@/utils/cn';

const mockPlugins: Plugin[] = [
  {
    id: 'p1', name: 'SaaS软件行业包', description: '面向B端SaaS销售的全套话术、场景和知识库',
    icon: '💻', category: 'domestic', installCount: 1280, installed: true, active: true,
    scriptCount: 45, scenarioCount: 12, lastUpdated: '2025-05-20', version: '2.1.0', rating: 4.8, reviewCount: 86,
  },
  {
    id: 'p2', name: '医疗器械行业包', description: '医疗设备、耗材、试剂销售专用',
    icon: '🏥', category: 'domestic', installCount: 960, installed: true, active: false,
    scriptCount: 38, scenarioCount: 10, lastUpdated: '2025-05-18', version: '1.8.0', rating: 4.6, reviewCount: 72,
  },
  {
    id: 'p3', name: '教育培训行业包', description: 'K12、职教、素质教育招生话术',
    icon: '📚', category: 'domestic', installCount: 845, installed: false, active: false,
    scriptCount: 32, scenarioCount: 8, lastUpdated: '2025-05-15', version: '1.5.0', rating: 4.5, reviewCount: 54,
  },
  {
    id: 'p4', name: '房地产行业包', description: '新房、二手房、商业地产销售全流程',
    icon: '🏠', category: 'domestic', installCount: 720, installed: false, active: false,
    scriptCount: 28, scenarioCount: 9, lastUpdated: '2025-05-12', version: '1.3.0', rating: 4.3, reviewCount: 48,
  },
  {
    id: 'p5', name: '金融服务行业包', description: '银行、保险、证券理财销售专用话术',
    icon: '💰', category: 'domestic', installCount: 1100, installed: false, active: false,
    scriptCount: 42, scenarioCount: 11, lastUpdated: '2025-05-22', version: '2.0.0', rating: 4.7, reviewCount: 95,
  },
  {
    id: 'p6', name: '跨境电商行业包', description: 'Amazon、Shopify独立站运营与销售',
    icon: '🌐', category: 'overseas', installCount: 650, installed: false, active: false,
    scriptCount: 35, scenarioCount: 10, lastUpdated: '2025-05-10', version: '1.2.0', rating: 4.4, reviewCount: 41,
  },
  {
    id: 'p7', name: '海外SaaS (Global)', description: 'International B2B SaaS sales toolkit',
    icon: '☁️', category: 'overseas', installCount: 520, installed: false, active: false,
    scriptCount: 40, scenarioCount: 12, lastUpdated: '2025-05-08', version: '1.1.0', rating: 4.6, reviewCount: 38,
  },
  {
    id: 'p8', name: '东南亚电商行业包', description: 'Shopee、Lazada、TikTok Shop东南亚市场',
    icon: '🛒', category: 'overseas', installCount: 380, installed: false, active: false,
    scriptCount: 25, scenarioCount: 7, lastUpdated: '2025-05-05', version: '1.0.0', rating: 4.2, reviewCount: 22,
  },
];

export function PluginMarketplace() {
  const { plugins, categoryFilter, setCategoryFilter, setSelectedPlugin } = usePluginStore();

  const displayPlugins = plugins.length > 0 ? plugins : mockPlugins;

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
        <div className="py-16 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-400">该分类下暂无插件</p>
        </div>
      )}
    </div>
  );
}
