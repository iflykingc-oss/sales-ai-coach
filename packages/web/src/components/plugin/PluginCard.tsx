import { Star, Download, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usePluginStore, type Plugin } from '@/stores/pluginStore';

interface PluginCardProps {
  plugin: Plugin;
  onDetail?: (plugin: Plugin) => void;
}

export function PluginCard({ plugin, onDetail }: PluginCardProps) {
  const { installPluginPersisted, uninstallPluginPersisted, setActivePlugin } = usePluginStore();

  const handleUninstall = async () => {
    if (window.confirm(`确定要卸载「${plugin.name}」吗？`)) {
      await uninstallPluginPersisted(plugin.id);
    }
  };

  return (
    <div className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-primary-200 hover:shadow-md">
      {/* Icon and Name */}
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 text-2xl">
          {plugin.icon}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900">{plugin.name}</h4>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs text-gray-600">{plugin.rating}</span>
            </div>
            <span className="text-xs text-gray-400">({plugin.reviewCount}条评价)</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="mt-3 line-clamp-2 text-xs text-gray-500">{plugin.description}</p>

      {/* Meta */}
      <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Download className="h-3 w-3" />
          {plugin.installCount.toLocaleString()}
        </span>
        <span>{plugin.scriptCount} 话术</span>
        <span>{plugin.scenarioCount} 场景</span>
      </div>

      {/* Category badge */}
      <div className="mt-3">
        <Badge variant={plugin.category === 'domestic' ? 'info' : 'warning'}>
          {plugin.category === 'domestic' ? '国内' : '海外'}
        </Badge>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        {plugin.installed ? (
          plugin.active ? (
            <Button variant="ghost" size="sm" className="flex-1 text-green-600" disabled>
              <Check className="mr-1 h-3.5 w-3.5" />
              使用中
            </Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setActivePlugin(plugin.id)}>
                切换到
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUninstall}
              >
                卸载
              </Button>
            </>
          )
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => installPluginPersisted(plugin.id)}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            安装
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDetail?.(plugin)}
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
