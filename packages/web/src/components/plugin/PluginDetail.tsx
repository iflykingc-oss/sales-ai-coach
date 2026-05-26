import { useState } from 'react';
import { Star, Download, FileText, Target, BookOpen, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Dialog, DialogOverlay, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { usePluginStore, getInstalledVersion, type Plugin } from '@/stores/pluginStore';
import { getPluginScripts, getPluginScenarios, allConfigs } from '@/data/pluginContent';
import { DialogueChainViewer } from '@/components/session/DialogueChainViewer';

const difficultyLabels: Record<string, string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '高级',
};

const difficultyVariants: Record<string, 'success' | 'warning' | 'danger'> = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger',
};

interface PluginConfig {
  id: string;
  industry: string;
  differentiator: string;
  pain1: string;
  pain2: string;
  pain3: string;
  competitor: string;
  criteria: string;
  advantage: string;
}

function getPluginKnowledge(pluginId: string): string[] {
  const config = allConfigs.find((c: PluginConfig) => c.id === pluginId);
  if (!config) return ['行业知识加载中...'];
  const knowledge: string[] = [];
  if (config.industry) knowledge.push(`${config.industry}销售全流程`);
  if (config.differentiator) knowledge.push(`核心优势: ${config.differentiator}`);
  const pains = [config.pain1, config.pain2, config.pain3].filter(Boolean);
  if (pains.length > 0) knowledge.push(`典型痛点: ${pains.join('、')}`);
  if (config.competitor) knowledge.push(`主要竞品: ${config.competitor}`);
  if (config.criteria) knowledge.push(`客户决策标准: ${config.criteria}`);
  if (config.advantage) knowledge.push(`差异化卖点: ${config.advantage}`);
  return knowledge.length > 0 ? knowledge : ['行业知识加载中...'];
}

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

const MAX_FREE_PLUGINS = 3;

interface PluginDetailProps {
  plugin: Plugin;
  onClose: () => void;
}

export function PluginDetail({ plugin, onClose }: PluginDetailProps) {
  const { installPluginPersisted, uninstallPluginPersisted, setActivePlugin, plugins } = usePluginStore();
  const scripts = getPluginScripts(plugin.id);
  const scenarios = getPluginScenarios(plugin.id);
  const knowledge = getPluginKnowledge(plugin.id);
  const [activeTab, setActiveTab] = useState('overview');
  const [showUninstallDialog, setShowUninstallDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const installedVersion = getInstalledVersion(plugin.id);
  const hasUpdate = installedVersion && compareSemver(plugin.version, installedVersion) > 0;

  const installedPluginsCount = plugins.filter((p) => p.installed).length;
  const canInstall = !plugin.installed && (installedPluginsCount < MAX_FREE_PLUGINS);

  const handleInstall = async () => {
    if (!canInstall) {
      setShowUpgradeDialog(true);
      return;
    }
    await installPluginPersisted(plugin.id);
  };

  const handleUninstall = async () => {
    await uninstallPluginPersisted(plugin.id);
    setShowUninstallDialog(false);
  };

  const handleUpdate = async () => {
    await installPluginPersisted(plugin.id);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 text-3xl">
            {plugin.icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{plugin.name}</h3>
            <p className="mt-1 text-sm text-gray-500">{plugin.description}</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium text-gray-700">{plugin.rating}</span>
              </div>
              <span className="text-xs text-gray-400">({plugin.reviewCount}条评价)</span>
              <Badge variant={plugin.category === 'domestic' ? 'info' : 'warning'}>
                {plugin.category === 'domestic' ? '国内行业' : '海外行业'}
              </Badge>
              <span className="text-xs text-gray-400">v{plugin.version}</span>
              {hasUpdate && (
                <Badge variant="warning">
                  <RefreshCw className="mr-1 h-3 w-3" />
                  有更新 (已安装 v{installedVersion})
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>关闭</Button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <Download className="mx-auto h-5 w-5 text-gray-400" />
          <p className="mt-1 text-lg font-semibold text-gray-900">{plugin.installCount.toLocaleString()}</p>
          <p className="text-xs text-gray-500">安装次数</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <FileText className="mx-auto h-5 w-5 text-gray-400" />
          <p className="mt-1 text-lg font-semibold text-gray-900">{scripts.length}</p>
          <p className="text-xs text-gray-500">话术数量</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <Target className="mx-auto h-5 w-5 text-gray-400" />
          <p className="mt-1 text-lg font-semibold text-gray-900">{scenarios.length}</p>
          <p className="text-xs text-gray-500">场景数量</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <BookOpen className="mx-auto h-5 w-5 text-gray-400" />
          <p className="mt-1 text-lg font-semibold text-gray-900">{plugin.lastUpdated}</p>
          <p className="text-xs text-gray-500">最近更新</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="scripts">话术模板</TabsTrigger>
            <TabsTrigger value="scenarios">陪练场景</TabsTrigger>
            <TabsTrigger value="dialogue">对话链预览</TabsTrigger>
            <TabsTrigger value="knowledge">知识库</TabsTrigger>
          </TabsList>

          {/* Overview tab */}
          <TabsContent value="overview">
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="mb-2 text-sm font-medium text-gray-700">插件包说明</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• 包含 {scripts.length} 条行业话术模板</li>
                  <li>• 包含 {scenarios.length} 个陪练场景</li>
                  <li>• 覆盖典型客户画像与对话链</li>
                  <li>• 持续更新，支持自动检测新版本</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* Scripts tab */}
          <TabsContent value="scripts">
            <div className="space-y-2">
              {scripts.map((script) => (
                <div key={script.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{script.title}</span>
                    <Badge>{script.scenario}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{script.content}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Scenarios tab */}
          <TabsContent value="scenarios">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {scenarios.map((scenario) => (
                <div key={scenario.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{scenario.name}</span>
                    <Badge variant={difficultyVariants[scenario.difficulty]}>
                      {difficultyLabels[scenario.difficulty]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{scenario.description}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Dialogue chain preview tab */}
          <TabsContent value="dialogue">
            <div className="rounded-lg border border-gray-100 p-4">
              <DialogueChainViewer pluginId={plugin.id} />
            </div>
          </TabsContent>

          {/* Knowledge tab */}
          <TabsContent value="knowledge">
            <div className="space-y-4">
              <div className="rounded-lg bg-primary-50 p-4">
                <ul className="space-y-2 text-sm text-gray-700">
                  {knowledge.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 text-primary-600">&#8226;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: '决策者画像', desc: '企业CXO/部门负责人特征' },
                  { label: '影响者画像', desc: '技术/采购部门关注点' },
                  { label: '使用者画像', desc: '一线员工使用习惯' },
                ].map((t) => (
                  <div key={t.label} className="rounded-lg border border-gray-100 p-3 text-center">
                    <p className="text-sm font-medium text-gray-900">{t.label}</p>
                    <p className="mt-1 text-xs text-gray-500">{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        {plugin.installed ? (
          <div className="flex w-full gap-3">
            {plugin.active ? (
              <Button className="flex-1" disabled>当前使用中</Button>
            ) : (
              <Button className="flex-1" onClick={() => setActivePlugin(plugin.id)}>
                切换为当前插件
              </Button>
            )}
            {hasUpdate && (
              <Button variant="secondary" onClick={handleUpdate}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                更新到 v{plugin.version}
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowUninstallDialog(true)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              卸载
            </Button>
          </div>
        ) : (
          <Button className="flex-1" onClick={handleInstall}>
            <Download className="mr-2 h-4 w-4" />
            安装此插件包
          </Button>
        )}
      </div>

      {/* Uninstall confirmation dialog */}
      <Dialog open={showUninstallDialog} onOpenChange={setShowUninstallDialog}>
        <DialogOverlay />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认卸载</DialogTitle>
            <DialogDescription>
              确定要卸载「{plugin.name}」吗？卸载后相关话术和场景将不再可用。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowUninstallDialog(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={handleUninstall}>
              <AlertTriangle className="mr-1.5 h-4 w-4" />
              确认卸载
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade dialog for plan gating */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogOverlay />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>插件安装数量已达上限</DialogTitle>
            <DialogDescription>
              免费版最多安装 {MAX_FREE_PLUGINS} 个插件包，当前已安装 {installedPluginsCount} 个。
              升级到专业版可解锁无限插件安装和更多高级功能。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowUpgradeDialog(false)}>
              稍后再说
            </Button>
            <Button>升级到专业版</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
