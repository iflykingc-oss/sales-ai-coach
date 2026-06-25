import { logger } from '@/utils/logger';
import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Play, Pause, Plus, CheckCircle, AlertCircle,
  Database, Globe, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/services/api';
import { toast } from '@/hooks/useToast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/Dialog';

interface SyncStatus {
  status: string;
  lastSyncTime: string | null;
  registeredIndustries: number;
  externalApis: Array<{
    name: string;
    enabled: boolean;
    lastFetch: string | null;
    errorCount: number;
  }>;
  recentSyncs: Array<{
    time: string;
    duration: number;
    results: Record<string, any>;
  }>;
}

interface ExternalSource {
  name: string;
  url: string;
  method: string;
  enabled: boolean;
}

export function SyncManager() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSource, setNewSource] = useState<ExternalSource>({
    name: '',
    url: '',
    method: 'GET',
    enabled: true,
  });

  // 获取同步状态
  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/sync/status');
      setStatus((res as any)?.data || null);
    } catch (err) {
      logger.error('Failed to fetch sync status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // 每 30 秒刷新状态
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // 手动触发同步
  const handleTriggerSync = async () => {
    try {
      setIsSyncing(true);
      await api.post('/admin/sync/trigger');
      toast.success('同步完成');
      await fetchStatus();
    } catch (err) {
      logger.error('Failed to trigger sync:', err);
      toast.error('同步失败');
    } finally {
      setIsSyncing(false);
    }
  };

  // 启动/停止自动同步
  const handleToggleAutoSync = async (enabled: boolean) => {
    try {
      await api.post('/admin/sync/auto', { enabled });
      toast.success(enabled ? '自动同步已启动' : '自动同步已停止');
      await fetchStatus();
    } catch (err) {
      logger.error('Failed to toggle auto sync:', err);
      toast.error('操作失败');
    }
  };

  // 添加外部数据源
  const handleAddSource = async () => {
    if (!newSource.name || !newSource.url) {
      toast.error('请填写数据源名称和 URL');
      return;
    }

    try {
      await api.post('/admin/sync/sources', newSource);
      toast.success(`数据源 [${newSource.name}] 已添加`);
      setShowAddDialog(false);
      setNewSource({ name: '', url: '', method: 'GET', enabled: true });
      await fetchStatus();
    } catch (err) {
      logger.error('Failed to add source:', err);
      toast.error('添加失败');
    }
  };

  // 格式化时间
  const formatTime = (time: string | null) => {
    if (!time) return '从未';
    const date = new Date(time);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    return `${Math.floor(hours / 24)} 天前`;
  };

  // 状态颜色
  const statusColors: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
    idle: { bg: 'bg-gray-100', text: 'text-gray-600', icon: Clock },
    syncing: { bg: 'bg-blue-100', text: 'text-blue-600', icon: RefreshCw },
    success: { bg: 'bg-green-100', text: 'text-green-600', icon: CheckCircle },
    error: { bg: 'bg-red-100', text: 'text-red-600', icon: AlertCircle },
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
          <span className="text-sm text-gray-500">加载同步状态...</span>
        </div>
      </Card>
    );
  }

  const statusInfo = statusColors[status?.status || 'idle'];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      {/* 同步状态卡片 */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${statusInfo.bg}`}>
              <StatusIcon className={`h-6 w-6 ${statusInfo.text} ${status?.status === 'syncing' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">数据同步状态</h3>
              <p className="text-sm text-gray-500">
                已注册 {status?.registeredIndustries || 0} 个行业 ·
                上次同步: {formatTime(status?.lastSyncTime || null)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleTriggerSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              {isSyncing ? '同步中...' : '立即同步'}
            </Button>

            <Button
              variant={status?.status === 'syncing' ? 'danger' : 'primary'}
              onClick={() => handleToggleAutoSync(status?.status !== 'syncing')}
            >
              {status?.status === 'syncing' ? (
                <>
                  <Pause className="mr-1.5 h-4 w-4" />
                  停止自动同步
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-4 w-4" />
                  启动自动同步
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 最近同步记录 */}
        {status?.recentSyncs && status.recentSyncs.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h4 className="mb-3 text-sm font-medium text-gray-700">最近同步记录</h4>
            <div className="space-y-2">
              {status.recentSyncs.slice(-3).reverse().map((sync, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {new Date(sync.time).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500">
                      耗时: {sync.duration}ms
                    </span>
                    <Badge variant="success">完成</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 外部数据源 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">外部数据源</h3>
            <p className="text-sm text-gray-500">配置自动同步的外部 API 数据源</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            添加数据源
          </Button>
        </div>

        {status?.externalApis && status.externalApis.length > 0 ? (
          <div className="space-y-3">
            {status.externalApis.map((api, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900">{api.name}</p>
                    <p className="text-xs text-gray-500">
                      上次获取: {formatTime(api.lastFetch)}
                      {api.errorCount > 0 && (
                        <span className="ml-2 text-red-500">
                          错误: {api.errorCount} 次
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <Badge variant={api.enabled ? 'success' : 'default'}>
                  {api.enabled ? '已启用' : '已禁用'}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <Database className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">暂无外部数据源</p>
            <p className="text-xs text-gray-400">点击上方按钮添加</p>
          </div>
        )}
      </Card>

      {/* 添加数据源对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加外部数据源</DialogTitle>
            <DialogDescription>
              配置外部 API 作为行业数据来源
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">数据源名称 *</label>
              <Input
                value={newSource.name}
                onChange={(e) => setNewSource(prev => ({ ...prev, name: e.target.value }))}
                placeholder="如：行业数据API"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">API URL *</label>
              <Input
                value={newSource.url}
                onChange={(e) => setNewSource(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://api.example.com/industries"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">请求方法</label>
                <select
                  value={newSource.method}
                  onChange={(e) => setNewSource(prev => ({ ...prev, method: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newSource.enabled}
                    onChange={(e) => setNewSource(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">立即启用</span>
                </label>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-blue-700">
                <strong>期望的 API 响应格式：</strong>
              </p>
              <pre className="mt-1 text-xs text-blue-600">
{`[
  {
    "name": "行业名称",
    "config": {
      "role": "销售角色",
      "keywords": ["关键词1", "关键词2"],
      "painPoints": ["痛点1"],
      "valueProps": ["价值1"]
    }
  }
]`}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={handleAddSource}>添加数据源</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
