import { useState, useEffect } from 'react';
import { Save, DollarSign, Package, Users, Crown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/hooks/useToast';

interface PlanTier {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    scripts: number;
    practices: number;
    reviews: number;
    teamMembers: number;
  };
  isPopular: boolean;
}

const DEFAULT_PLANS: PlanTier[] = [
  {
    id: 'FREE',
    name: '免费版',
    price: 0,
    interval: 'month',
    features: ['每月5次话术生成', '每月3次AI陪练', '基础行业知识库', '个人使用'],
    limits: { scripts: 5, practices: 3, reviews: 1, teamMembers: 0 },
    isPopular: false,
  },
  {
    id: 'PROFESSIONAL',
    name: '专业版',
    price: 99,
    interval: 'month',
    features: ['无限话术生成', '无限AI陪练', '完整行业知识库', '公司专属知识', '数据分析报告'],
    limits: { scripts: -1, practices: -1, reviews: -1, teamMembers: 0 },
    isPopular: true,
  },
  {
    id: 'TEAM',
    name: '团队版',
    price: 299,
    interval: 'month',
    features: ['专业版全部功能', '最多20名成员', '团队管理功能', '任务分配与追踪', '话术共享与审核'],
    limits: { scripts: -1, practices: -1, reviews: -1, teamMembers: 20 },
    isPopular: false,
  },
  {
    id: 'ENTERPRISE',
    name: '企业版',
    price: -1,
    interval: 'month',
    features: ['团队版全部功能', '无限成员', '专属客服', '定制化需求', 'API接口'],
    limits: { scripts: -1, practices: -1, reviews: -1, teamMembers: -1 },
    isPopular: false,
  },
];

export function PlanConfig() {
  const [plans, setPlans] = useState<PlanTier[]>(DEFAULT_PLANS);
  const [editingPlan, setEditingPlan] = useState<PlanTier | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editingPlan) return;

    setSaving(true);
    try {
      // 保存到后端（需要实现API）
      // await api.put(`/admin/plans/${editingPlan.id}`, editingPlan);

      setPlans(plans.map(p => p.id === editingPlan.id ? editingPlan : p));
      setEditingPlan(null);
      toast.success('套餐配置已保存');
    } catch (err) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'FREE': return <Package className="h-6 w-6" />;
      case 'PROFESSIONAL': return <DollarSign className="h-6 w-6" />;
      case 'TEAM': return <Users className="h-6 w-6" />;
      case 'ENTERPRISE': return <Crown className="h-6 w-6" />;
      default: return <Package className="h-6 w-6" />;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'FREE': return 'gray';
      case 'PROFESSIONAL': return 'blue';
      case 'TEAM': return 'purple';
      case 'ENTERPRISE': return 'amber';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">套餐配置</h3>
          <p className="text-sm text-gray-500">管理各套餐的价格、功能和使用限制</p>
        </div>
      </div>

      {/* 套餐列表 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative overflow-hidden ${plan.isPopular ? 'border-2 border-primary-500' : ''}`}>
            {plan.isPopular && (
              <div className="absolute right-2 top-2">
                <Badge variant="primary">推荐</Badge>
              </div>
            )}

            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className={`rounded-lg bg-${getPlanColor(plan.id)}-100 p-2 text-${getPlanColor(plan.id)}-600`}>
                  {getPlanIcon(plan.id)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                  <p className="text-sm text-gray-500">{plan.id}</p>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">
                  {plan.price === -1 ? '联系销售' : plan.price === 0 ? '免费' : `¥${plan.price}`}
                </span>
                {plan.price > 0 && (
                  <span className="text-sm text-gray-500">/{plan.interval === 'month' ? '月' : '年'}</span>
                )}
              </div>

              <ul className="mb-6 space-y-2">
                {plan.features.slice(0, 4).map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-green-500">✓</span>
                    {feature}
                  </li>
                ))}
                {plan.features.length > 4 && (
                  <li className="text-sm text-gray-400">+{plan.features.length - 4} 更多功能</li>
                )}
              </ul>

              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>话术生成</span>
                  <span>{plan.limits.scripts === -1 ? '无限' : `${plan.limits.scripts}次/月`}</span>
                </div>
                <div className="flex justify-between">
                  <span>AI陪练</span>
                  <span>{plan.limits.practices === -1 ? '无限' : `${plan.limits.practices}次/月`}</span>
                </div>
                <div className="flex justify-between">
                  <span>团队成员</span>
                  <span>{plan.limits.teamMembers === -1 ? '无限' : plan.limits.teamMembers === 0 ? '无' : `${plan.limits.teamMembers}人`}</span>
                </div>
              </div>

              <Button
                variant="secondary"
                className="mt-4 w-full"
                onClick={() => setEditingPlan({ ...plan })}
              >
                编辑配置
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* 编辑对话框 */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">编辑套餐：{editingPlan.name}</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">套餐名称</label>
                  <Input
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">价格（元/月）</label>
                  <Input
                    type="number"
                    value={editingPlan.price === -1 ? '' : editingPlan.price}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: e.target.value ? parseInt(e.target.value) : -1 })}
                    placeholder="留空表示联系销售"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">功能特性（每行一个）</label>
                <textarea
                  value={editingPlan.features.join('\n')}
                  onChange={(e) => setEditingPlan({ ...editingPlan, features: e.target.value.split('\n').filter(Boolean) })}
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">话术生成限制</label>
                  <Input
                    type="number"
                    value={editingPlan.limits.scripts === -1 ? '' : editingPlan.limits.scripts}
                    onChange={(e) => setEditingPlan({
                      ...editingPlan,
                      limits: { ...editingPlan.limits, scripts: e.target.value ? parseInt(e.target.value) : -1 }
                    })}
                    placeholder="-1 表示无限"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">AI陪练限制</label>
                  <Input
                    type="number"
                    value={editingPlan.limits.practices === -1 ? '' : editingPlan.limits.practices}
                    onChange={(e) => setEditingPlan({
                      ...editingPlan,
                      limits: { ...editingPlan.limits, practices: e.target.value ? parseInt(e.target.value) : -1 }
                    })}
                    placeholder="-1 表示无限"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">复盘限制</label>
                  <Input
                    type="number"
                    value={editingPlan.limits.reviews === -1 ? '' : editingPlan.limits.reviews}
                    onChange={(e) => setEditingPlan({
                      ...editingPlan,
                      limits: { ...editingPlan.limits, reviews: e.target.value ? parseInt(e.target.value) : -1 }
                    })}
                    placeholder="-1 表示无限"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">团队成员限制</label>
                  <Input
                    type="number"
                    value={editingPlan.limits.teamMembers === -1 ? '' : editingPlan.limits.teamMembers}
                    onChange={(e) => setEditingPlan({
                      ...editingPlan,
                      limits: { ...editingPlan.limits, teamMembers: e.target.value ? parseInt(e.target.value) : -1 }
                    })}
                    placeholder="-1 表示无限"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPopular"
                  checked={editingPlan.isPopular}
                  onChange={(e) => setEditingPlan({ ...editingPlan, isPopular: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isPopular" className="text-sm text-gray-700">标记为推荐套餐</label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingPlan(null)}>取消</Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-1.5 h-4 w-4" />
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
