import { useState, useEffect } from 'react';
import { Check, Crown, Zap, Users, Building2, ArrowRight, Loader2, AlertCircle, X } from 'lucide-react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { cn } from '@/utils/cn';
import { useUserStore } from '@/stores/userStore';
import { useI18n } from '@/i18n';
import { api } from '@/services/api';
import { PayPalCheckout } from '@/components/payment/PayPalCheckout';
import { formatPrice } from '@/utils/currency';

interface PlanTier {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  limits: Record<string, number>;
}

interface CurrentPlan {
  plan: string;
  tier: { name: string; price: number; features: string[] };
  usage: Array<{ action: string; used: number; limit: number; remaining: number }>;
}

const PLAN_ICONS: Record<string, typeof Check> = {
  FREE: Zap,
  PROFESSIONAL: Crown,
  TEAM: Users,
  ENTERPRISE: Building2,
};

const PLAN_COLORS: Record<string, { bg: string; border: string; text: string; button: string }> = {
  FREE: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-900', button: 'bg-gray-600 hover:bg-gray-700' },
  PROFESSIONAL: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900', button: 'bg-blue-600 hover:bg-blue-700' },
  TEAM: { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-900', button: 'bg-violet-600 hover:bg-violet-700' },
  ENTERPRISE: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900', button: 'bg-amber-600 hover:bg-amber-700' },
};

const ACTION_LABELS: Record<string, string> = {
  scripts: '话术生成',
  practices: 'AI 陪练',
  reviews: '复盘分析',
};

export function PricingPage() {
  const user = useUserStore((s) => s.user);
  const { locale } = useI18n();
  const [tiers, setTiers] = useState<PlanTier[]>([]);
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [tiersRes, currentRes] = await Promise.all([
        api.get('/plans'),
        api.get('/plans/current'),
      ]);
      setTiers(tiersRes.data.data);
      setCurrentPlan(currentRes.data.data);
    } catch {
      setError('Failed to load plan information');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(targetPlan: string) {
    if (targetPlan === 'ENTERPRISE') {
      alert('企业版请联系我们：sales@aisalecoach.com');
      return;
    }

    const plan = tiers.find(t => t.id === targetPlan);
    if (plan) {
      setSelectedPlan(plan);
    }
  }

  async function handlePaymentSuccess() {
    setSelectedPlan(null);
    // Refresh user data
    const meRes = await api.get('/auth/me');
    if (meRes.data.data) {
      useUserStore.getState().setUser(meRes.data.data);
    }
    await loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const planOrder: Record<string, number> = { FREE: 0, PROFESSIONAL: 1, TEAM: 2, ENTERPRISE: 3 };
  const currentPlanIndex = planOrder[user?.plan || 'FREE'] ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">选择您的套餐</h1>
        <p className="mt-2 text-gray-600">升级解锁更多功能，提升销售效率</p>
      </div>

      {/* Current plan banner */}
      {currentPlan && (
        <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="text-sm text-blue-600 font-medium">当前套餐</span>
              <h3 className="text-lg font-bold text-blue-900">{currentPlan.tier.name}</h3>
            </div>
            <div className="flex gap-6">
              {currentPlan.usage.map((u) => (
                <div key={u.action} className="text-center">
                  <div className="text-xs text-blue-600">{ACTION_LABELS[u.action] || u.action}</div>
                  <div className="text-sm font-semibold text-blue-900">
                    {u.limit === -1 ? '无限' : `${u.used} / ${u.limit}`}
                  </div>
                  {u.limit !== -1 && (
                    <div className="mt-1 h-1.5 w-16 rounded-full bg-blue-200">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          u.used >= u.limit ? 'bg-red-500' : 'bg-blue-600',
                        )}
                        style={{ width: `${Math.min(100, (u.used / u.limit) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier) => {
          const Icon = PLAN_ICONS[tier.id] || Zap;
          const colors = PLAN_COLORS[tier.id] || PLAN_COLORS.FREE;
          const isCurrent = user?.plan === tier.id;
          const tierIndex = planOrder[tier.id] ?? 0;
          const isDowngrade = tierIndex < currentPlanIndex;

          return (
            <div
              key={tier.id}
              className={cn(
                'relative rounded-2xl border-2 p-6 transition-all',
                isCurrent ? 'border-blue-500 ring-2 ring-blue-200' : colors.border,
                colors.bg,
              )}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-medium text-white">
                  当前套餐
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={cn('rounded-lg p-2', isCurrent ? 'bg-blue-100' : 'bg-white')}>
                  <Icon className={cn('h-5 w-5', colors.text)} />
                </div>
                <div>
                  <h3 className={cn('font-bold', colors.text)}>{tier.name}</h3>
                </div>
              </div>

              <div className="mb-4">
                {tier.price === -1 ? (
                  <div className={cn('text-2xl font-bold', colors.text)}>
                    {locale === 'zh' ? '定制报价' : 'Custom'}
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className={cn('text-3xl font-bold', colors.text)}>
                      {formatPrice(tier.price, locale)}
                    </span>
                    <span className="text-sm text-gray-500">/{tier.period}</span>
                  </div>
                )}
              </div>

              <ul className="space-y-2.5 mb-6">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-500 cursor-default"
                >
                  当前套餐
                </button>
              ) : isDowngrade ? (
                <button
                  disabled
                  className="w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-400 cursor-default"
                >
                  降级需联系客服
                </button>
              ) : tier.id === 'ENTERPRISE' ? (
                <button
                  onClick={() => handleUpgrade('ENTERPRISE')}
                  className={cn(
                    'w-full rounded-lg py-2 text-sm font-medium text-white transition-colors',
                    colors.button,
                  )}
                >
                  联系销售
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(tier.id)}
                  className={cn(
                    'w-full rounded-lg py-2 text-sm font-medium text-white transition-colors flex items-center justify-center gap-2',
                    colors.button,
                  )}
                >
                  立即升级
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="mt-12 text-center text-sm text-gray-500">
        <p>升级立即生效，按自然月计费。企业版支持定制化部署和专属服务。</p>
        <p className="mt-1">如有疑问请联系：sales@aisalecoach.com</p>
      </div>

      {/* PayPal Checkout Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <button
              onClick={() => setSelectedPlan(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-4">升级到 {selectedPlan.name}</h2>
            <PayPalScriptProvider options={{ clientId: 'AahOPjypTzhAPRxiqfYysZ4lj528Du-FQeGIDHwsBPEEmAGa1HsrWjZx1z_BPWDKMRw3ZkQoPnQGrgVm', currency: 'CNY' }}>
              <PayPalCheckout
                plan={selectedPlan}
                onSuccess={handlePaymentSuccess}
                onCancel={() => setSelectedPlan(null)}
              />
            </PayPalScriptProvider>
          </div>
        </div>
      )}
    </div>
  );
}

export default PricingPage;
