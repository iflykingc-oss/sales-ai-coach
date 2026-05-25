import { useState } from 'react';
import { Plus, Edit3, Trash2, RotateCcw, Download, Users, Star, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/Dialog';
import { useAdminStore, type PluginAdmin } from '@/stores/adminStore';
import { cn } from '@/utils/cn';

const mockAdminPlugins: PluginAdmin[] = [
  {
    id: 'ap1', name: 'SaaS软件行业包', version: '2.1.0', installCount: 1280,
    activeRate: 68, reviewCount: 86, lastUpdated: '2025-05-20',
    versions: [
      { version: '2.1.0', date: '2025-05-20', changelog: '新增竞品分析模块' },
      { version: '2.0.0', date: '2025-04-15', changelog: '重构话术模板结构' },
      { version: '1.9.0', date: '2025-03-01', changelog: '新增关单场景' },
    ],
  },
  {
    id: 'ap2', name: '医疗器械行业包', version: '1.8.0', installCount: 960,
    activeRate: 45, reviewCount: 72, lastUpdated: '2025-05-18',
    versions: [
      { version: '1.8.0', date: '2025-05-18', changelog: '更新合规知识库' },
      { version: '1.7.0', date: '2025-04-10', changelog: '新增耗材销售场景' },
    ],
  },
  {
    id: 'ap3', name: '金融行业包', version: '2.0.0', installCount: 1100,
    activeRate: 55, reviewCount: 95, lastUpdated: '2025-05-22',
    versions: [
      { version: '2.0.0', date: '2025-05-22', changelog: '全面升级理财销售模块' },
      { version: '1.5.0', date: '2025-02-20', changelog: '新增保险话术' },
    ],
  },
];

export function PluginAdmin() {
  const { adminPlugins, setAdminPlugins, addAdminPlugin } = useAdminStore();

  if (adminPlugins.length === 0) {
    setAdminPlugins(mockAdminPlugins);
  }

  const displayPlugins = adminPlugins.length > 0 ? adminPlugins : mockAdminPlugins;

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showVersionsDialog, setShowVersionsDialog] = useState<string | null>(null);
  const [newPlugin, setNewPlugin] = useState({ name: '', description: '', category: 'domestic' });

  const handleCreatePlugin = () => {
    if (!newPlugin.name) return;
    const plugin: PluginAdmin = {
      id: `ap${Date.now()}`,
      name: newPlugin.name,
      version: '1.0.0',
      installCount: 0,
      activeRate: 0,
      reviewCount: 0,
      lastUpdated: new Date().toISOString().split('T')[0],
      versions: [{ version: '1.0.0', date: new Date().toISOString().split('T')[0], changelog: '初始版本' }],
    };
    addAdminPlugin(plugin);
    setNewPlugin({ name: '', description: '', category: 'domestic' });
    setShowCreateDialog(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">行业插件包管理</h3>
          <p className="mt-1 text-sm text-gray-500">管理所有行业插件包的发布和版本</p>
        </div>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          创建插件包
        </Button>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-primary-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {displayPlugins.reduce((sum, p) => sum + p.installCount, 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">总安装量</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {displayPlugins.length > 0 ? Math.round(displayPlugins.reduce((sum, p) => sum + p.activeRate, 0) / displayPlugins.length) : 0}%
              </p>
              <p className="text-sm text-gray-500">平均活跃率</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {displayPlugins.reduce((sum, p) => sum + p.reviewCount, 0)}
              </p>
              <p className="text-sm text-gray-500">总评价数</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Plugin List */}
      {displayPlugins.map((plugin) => (
        <Card key={plugin.id}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 text-lg font-bold text-primary-700">
                {plugin.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{plugin.name}</span>
                  <Badge>v{plugin.version}</Badge>
                </div>
                <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                  <span>{plugin.installCount.toLocaleString()} 安装</span>
                  <span>活跃率 {plugin.activeRate}%</span>
                  <span>{plugin.reviewCount} 评价</span>
                  <span>更新于 {plugin.lastUpdated}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowVersionsDialog(plugin.id)}>
                <GitBranch className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {/* Create Plugin Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新插件包</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">插件名称</label>
              <Input
                value={newPlugin.name}
                onChange={(e) => setNewPlugin({ ...newPlugin, name: e.target.value })}
                placeholder="如：SaaS软件行业包"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">描述</label>
              <Textarea
                value={newPlugin.description}
                onChange={(e) => setNewPlugin({ ...newPlugin, description: e.target.value })}
                placeholder="插件包描述..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button onClick={handleCreatePlugin} disabled={!newPlugin.name}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      {showVersionsDialog && (
        <VersionHistoryDialog
          plugin={displayPlugins.find((p) => p.id === showVersionsDialog)!}
          onClose={() => setShowVersionsDialog(null)}
        />
      )}
    </div>
  );
}

function VersionHistoryDialog({ plugin, onClose }: { plugin: PluginAdmin; onClose: () => void }) {
  const [selectedVersion, setSelectedVersion] = useState(plugin.version);

  return (
    <Dialog open={!!plugin} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plugin.name} - 版本管理</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {plugin.versions.map((v) => (
            <div
              key={v.version}
              className={cn(
                'rounded-lg border p-3',
                v.version === selectedVersion ? 'border-primary-200 bg-primary-50' : 'border-gray-100',
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={v.version === selectedVersion ? 'info' : 'default'}>v{v.version}</Badge>
                  {v.version === plugin.version && <Badge variant="success">当前</Badge>}
                </div>
                <span className="text-xs text-gray-400">{v.date}</span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{v.changelog}</p>
              {v.version !== plugin.version && (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSelectedVersion(v.version)}>
                  <RotateCcw className="mr-1 h-3 w-3" />
                  回滚至此版本
                </Button>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
