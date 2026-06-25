import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Check, Crown, Zap, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  limit?: number;
  resetAt?: string;
}

const PLANS = [
  {
    id: 'PROFESSIONAL',
    name: '专业版',
    price: '¥99',
    period: '/月',
    icon: Zap,
    color: 'blue',
    popular: true,
    features: [
      '无限话术生成',
      '无限 AI 陪练',
      '无限复盘分析',
      '500 条知识库',
      '高级框架分析',
      'API 接口访问',
    ],
  },
  {
    id: 'TEAM',
    name: '团队版',
    price: '¥299',
    period: '/人/月',
    icon: Users,
    color: 'purple',
    popular: false,
    features: [
      '专业版全部功能',
      '团队协作空间',
      '团队任务管理',
      '共享话术库',
      '团队数据分析',
      '优先技术支持',
    ],
  },
];

export function UpgradeModal({ open, onOpenChange, feature, limit, resetAt }: UpgradeModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    setLoading(planId);
    try {
      // Navigate to pricing page with plan pre-selected
      onOpenChange(false);
      navigate(`/app/pricing?plan=${planId}`);
    } finally {
      setLoading(null);
    }
  };

  const featureName: Record<string, string> = {
    scripts: '话术生成',
    practices: 'AI 陪练',
    reviews: '复盘分析',
    knowledge: '知识库',
    plugins: '插件安装',
  };

  const displayName = feature ? featureName[feature] || feature : '此功能';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-[90vw] max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl">
            <Dialog.Close className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </Dialog.Close>

            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-8 h-8" />
              <Dialog.Title className="text-xl font-bold">
                升级以继续使用{displayName}
              </Dialog.Title>
            </div>

            {feature && limit && (
              <Dialog.Description className="text-blue-100">
                免费版每日可使用 {limit} 次{displayName}
                {resetAt && `，将于 ${new Date(resetAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 重置`}
              </Dialog.Description>
            )}
          </div>

          {/* Plans */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLANS.map((plan) => {
                const Icon = plan.icon;
                return (
                  <div
                    key={plan.id}
                    className={`relative border-2 rounded-lg p-5 transition-all hover:shadow-lg ${
                      plan.popular
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                        推荐
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <Icon className={`w-5 h-5 ${plan.popular ? 'text-blue-600' : 'text-gray-600'}`} />
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                    </div>

                    <div className="mb-4">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-gray-500">{plan.period}</span>
                    </div>

                    <ul className="space-y-2 mb-5">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.popular ? 'text-blue-600' : 'text-green-500'}`} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={loading === plan.id}
                      className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
                        plan.popular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {loading === plan.id ? '跳转中...' : '立即升级'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => { onOpenChange(false); navigate('/app/pricing'); }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                查看完整方案对比 →
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
