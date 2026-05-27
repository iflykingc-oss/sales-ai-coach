import { useState } from 'react';
import { Upload, Save, Key, Shield, Database, Download, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { useAdminStore } from '@/stores/adminStore';
import { cn } from '@/utils/cn';

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

  return (
    <div className="space-y-6">
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
