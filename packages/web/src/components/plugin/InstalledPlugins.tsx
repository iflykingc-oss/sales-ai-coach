import { useMemo } from 'react';
import { Check, Power } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Badge';
import {
  Select, SelectItem,
} from '@/components/ui/Select';
import { usePluginStore, type Plugin } from '@/stores/pluginStore';
import { industryDefinitions } from '@/data/pluginContent';
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

export function InstalledPlugins() {
  const { plugins, setActivePlugin, setSelectedPlugin } = usePluginStore();

  // Merge real definitions with store state
  const allPlugins = useMemo(() => {
    const base = industryDefinitions.map(toPlugin);
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

  const installedPlugins = allPlugins.filter((p) => p.installed);
  const activePlugin = installedPlugins.find((p) => p.active);

  if (installedPlugins.length === 0) {
    return (
      <Card>
        <div className="py-8 text-center">
          <p className="text-sm text-gray-400">暂无已安装的插件</p>
          <p className="mt-1 text-xs text-gray-400">前往插件市场安装行业插件包</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">已安装插件</h3>
          <p className="mt-1 text-sm text-gray-500">已安装 {installedPlugins.length} 个行业插件包</p>
        </div>
        {/* Quick Switch */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">当前使用:</span>
          <Select
            value={activePlugin?.id}
            onValueChange={(v) => setActivePlugin(v)}
            placeholder="选择插件"
          >
            {installedPlugins.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.icon} {p.name}
              </SelectItem>
            ))}
          </Select>
        </div>
      </div>

      {/* Installed List */}
      <div className="mt-4 space-y-2">
        {installedPlugins.map((plugin) => (
          <div
            key={plugin.id}
            className={cn(
              'flex cursor-pointer items-center justify-between rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50',
              plugin.active && 'border-primary-200 bg-primary-50/30',
            )}
            onClick={() => setSelectedPlugin(plugin)}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-xl">
                {plugin.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{plugin.name}</span>
                  {plugin.active && (
                    <Badge variant="success">
                      <Check className="mr-1 h-3 w-3" />
                      使用中
                    </Badge>
                  )}
                  <span className="text-xs text-gray-400">v{plugin.version}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-400">
                  <span>{plugin.scriptCount} 话术</span>
                  <span>{plugin.scenarioCount} 场景</span>
                  <span>更新于 {plugin.lastUpdated}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!plugin.active && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePlugin(plugin.id);
                  }}
                >
                  <Power className="mr-1 h-3.5 w-3.5" />
                  启用
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
