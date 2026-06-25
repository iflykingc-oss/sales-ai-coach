import { logger } from '@/utils/logger';
import { useState } from 'react';
import { Upload, Save, Key, Shield, Database, Download, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { useAdminStore } from '@/stores/adminStore';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';
import { toast } from '@/hooks/useToast';

const statusLabels: Record<string, string> = {
  active: '正常',
  disabled: '已禁用',
};

const statusVariants: Record<string, 'success' | 'danger'> = {
  active: 'success',
  disabled: 'danger',
};

export function SystemSettings() {
  const { systemName, setSystemName, systemUsers, toggleUserStatus } = useAdminStore();

  const [siteName, setSiteName] = useState(systemName);
  const [logoUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [initLoading, setInitLoading] = useState(false);
  const [initResult, setInitResult] = useState<{ success: boolean; message: string } | null>(null);

  const filteredUsers = searchQuery
    ? systemUsers.filter(
        (u) =>
          u.name.includes(searchQuery) ||
          u.email.includes(searchQuery),
      )
    : systemUsers;

  const handleSaveSite = () => {
    setSystemName(siteName);
  };

  // 初始化数据库
  const handleInitDb = async () => {
    if (!confirm('确定要初始化数据库吗？这将创建公告系统所需的表。')) return;

    setInitLoading(true);
    setInitResult(null);

    try {
      const res = await api.get('/admin/init-db');
      const data = (res as any)?.data;

      if (data?.success) {
        toast.success('数据库初始化成功');
        setInitResult({ type: 'success', message: '所有表已创建' });
      } else if (data?.reason === 'tables_missing') {
        // 需要手动执行 SQL
        setInitResult({
          type: 'sql',
          message: '需要在 Supabase SQL Editor 中执行以下 SQL',
          sql: data.sql,
          missingTables: data.missingTables
        });
        toast.warning('需要手动执行 SQL 创建表');
      } else {
        setInitResult({ type: 'error', message: '初始化失败' });
        toast.error('初始化失败');
      }
    } catch (err) {
      logger.error('Init DB error:', err);
      setInitResult({ type: 'error', message: '请求失败' });
      toast.error('初始化请求失败');
    } finally {
      setInitLoading(false);
    }
  };

  // 复制 SQL 到剪贴板
  const handleCopySql = () => {
    if (initResult?.sql) {
      navigator.clipboard.writeText(initResult.sql);
      toast.success('SQL 已复制到剪贴板');
    }
  };

  return (
    <div className="space-y-6">
      {/* Database Init */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900">数据库初始化</h3>
        <p className="mt-1 text-sm text-gray-500">初始化公告系统所需的数据库表</p>

        <div className="mt-4">
          <Button
            onClick={handleInitDb}
            disabled={initLoading}
          >
            {initLoading ? (
              <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Database className="mr-1.5 h-4 w-4" />
            )}
            {initLoading ? '检查中...' : '初始化公告系统表'}
          </Button>
        </div>

        {/* 初始化结果 */}
        {initResult && (
          <div className={cn(
            'mt-4 rounded-lg p-4',
            initResult.type === 'success' ? 'bg-green-50 border border-green-200' :
            initResult.type === 'sql' ? 'bg-yellow-50 border border-yellow-200' :
            'bg-red-50 border border-red-200'
          )}>
            <p className={cn(
              'text-sm font-medium',
              initResult.type === 'success' ? 'text-green-800' :
              initResult.type === 'sql' ? 'text-yellow-800' :
              'text-red-800'
            )}>
              {initResult.message}
            </p>

            {initResult.type === 'sql' && initResult.missingTables && (
              <p className="mt-1 text-sm text-yellow-700">
                缺失的表: {initResult.missingTables.join(', ')}
              </p>
            )}

            {initResult.type === 'sql' && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-yellow-800">SQL 语句:</span>
                  <Button variant="ghost" size="sm" onClick={handleCopySql}>
                    <Download className="mr-1 h-3 w-3" />
                    复制 SQL
                  </Button>
                </div>
                <pre className="bg-white rounded border border-yellow-300 p-3 text-xs overflow-x-auto max-h-64">
                  {initResult.sql}
                </pre>
                <p className="mt-2 text-xs text-yellow-700">
                  请在 <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">Supabase Dashboard</a> → SQL Editor 中执行上述 SQL
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Site Settings */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900">站点设置</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">站点名称</label>
            <Input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="销冠AI教练"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">站点 Logo</label>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-8 w-8" />
                ) : (
                  <span className="text-xs text-gray-400">默认</span>
                )}
              </div>
              <Button variant="secondary" size="sm">
                <Upload className="mr-1.5 h-4 w-4" />
                上传 Logo
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSaveSite}>
              <Save className="mr-1.5 h-4 w-4" />
              保存站点设置
            </Button>
          </div>
        </div>
      </Card>

      {/* User Management */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">用户管理</h3>
            <p className="mt-1 text-sm text-gray-500">管理系统用户账户</p>
          </div>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索用户..."
            className="w-64"
          />
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500">用户</th>
                <th className="px-4 py-3 font-medium text-gray-500">角色</th>
                <th className="px-4 py-3 font-medium text-gray-500">套餐</th>
                <th className="px-4 py-3 font-medium text-gray-500">最后登录</th>
                <th className="px-4 py-3 font-medium text-gray-500">状态</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8">
                    <EmptyState
                      icon={<Users className="h-6 w-6" />}
                      title={searchQuery ? '未找到匹配用户' : '暂无用户'}
                      description={searchQuery ? '尝试其他搜索关键词' : '用户注册后，此处将显示用户列表'}
                    />
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === 'ADMIN' ? 'warning' : 'default'}>
                      {user.role === 'ADMIN' ? '管理员' : '普通用户'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.plan}</td>
                  <td className="px-4 py-3 text-gray-500">{user.lastLogin}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariants[user.status]}>
                      {statusLabels[user.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm">
                        <Key className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleUserStatus(user.id)}
                      >
                        <Shield className={cn('h-3.5 w-3.5', user.status === 'active' ? 'text-red-500' : 'text-green-500')} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Data Backup */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900">数据备份</h3>
        <p className="mt-1 text-sm text-gray-500">管理系统数据备份与恢复</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" size="sm">
            <Database className="mr-1.5 h-4 w-4" />
            立即备份
          </Button>
          <Button variant="secondary" size="sm">
            <Download className="mr-1.5 h-4 w-4" />
            下载备份
          </Button>
        </div>
        <div className="mt-4 rounded-lg bg-gray-50 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">最近备份</span>
            <span className="text-gray-400">2025-05-24 03:00:00 (自动)</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-600">备份大小</span>
            <span className="text-gray-400">256 MB</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
