import { useState } from 'react';
import { Crown, Loader2, Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAdminStore } from '@/stores/adminStore';
import { api } from '@/services/api';

const PLANS = [
  { id: 'FREE', name: '免费版', color: 'bg-gray-100 text-gray-700' },
  { id: 'PROFESSIONAL', name: '专业版', color: 'bg-blue-100 text-blue-700' },
  { id: 'TEAM', name: '团队版', color: 'bg-violet-100 text-violet-700' },
  { id: 'ENTERPRISE', name: '企业版', color: 'bg-amber-100 text-amber-700' },
];

const PLAN_MAP = Object.fromEntries(PLANS.map((p) => [p.id, p]));

export function UserAdmin() {
  const { systemUsers, updateUserPlan } = useAdminStore();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handlePlanChange(userId: string, newPlan: string) {
    setSaving(userId);
    setSuccess(null);

    try {
      await api.put(`/admin/users/${userId}/plan`, { plan: newPlan });
      updateUserPlan(userId, newPlan);
      setSuccess(userId);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update plan');
    } finally {
      setSaving(null);
      setEditingUser(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-700">用户套餐管理</h3>
          <p className="text-xs text-gray-500">管理用户的套餐等级和权限</p>
        </div>
        <div className="flex gap-2">
          {PLANS.map((p) => (
            <span key={p.id} className={cn('rounded-full px-2 py-0.5 text-xs font-medium', p.color)}>
              {p.name}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">当前套餐</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">注册时间</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {systemUsers.map((user) => {
              const planInfo = PLAN_MAP[user.plan] || PLAN_MAP.FREE;
              const isEditing = editingUser === user.id;
              const isSaving = saving === user.id;
              const isSuccess = success === user.id;

              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      user.role === 'ADMIN' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700',
                    )}>
                      {user.role === 'ADMIN' ? '管理员' : '用户'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <select
                          defaultValue={user.plan}
                          onChange={(e) => handlePlanChange(user.id, e.target.value)}
                          disabled={isSaving}
                          className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        >
                          {PLANS.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500" />
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', planInfo.color)}>
                          {planInfo.name}
                        </span>
                        {isSuccess && <Check className="h-4 w-4 text-green-500" />}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <button
                        onClick={() => setEditingUser(null)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        取消
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingUser(user.id)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        修改套餐
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
