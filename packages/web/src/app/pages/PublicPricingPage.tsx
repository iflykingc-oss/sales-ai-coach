import { Check, Crown, Zap, Users, Building2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PLANS = [
  {
    id: 'FREE',
    name: '免费版',
    nameEn: 'Free',
    icon: Zap,
    price: '¥0',
    period: '永久',
    color: 'gray',
    popular: false,
    features: [
      '基础话术生成 (5次/天)',
      'AI 陪练 (3次/天)',
      '复盘分析 (1次/天)',
      '知识库 (50条)',
      '3 个行业插件',
    ],
  },
  {
    id: 'PROFESSIONAL',
    name: '专业版',
    nameEn: 'Professional',
    icon: Crown,
    price: '¥99',
    period: '/月',
    color: 'blue',
    popular: true,
    features: [
      '无限话术生成',
      '无限 AI 陪练',
      '无限复盘分析',
      '知识库 (500条)',
      '全部行业插件',
      '高级框架分析',
      'API 接口访问',
      '详细评估报告',
    ],
  },
  {
    id: 'TEAM',
    name: '团队版',
    nameEn: 'Team',
    icon: Users,
    price: '¥299',
    period: '/人/月',
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
  {
    id: 'ENTERPRISE',
    name: '企业版',
    nameEn: 'Enterprise',
    icon: Building2,
    price: '定制',
    period: '',
    color: 'gold',
    popular: false,
    features: [
      '团队版全部功能',
      '私有化部署',
      '定制行业插件',
      '专属客户经理',
      'SLA 保障',
      '数据安全审计',
      'SSO 单点登录',
    ],
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; button: string }> = {
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', button: 'bg-gray-100 text-gray-800 hover:bg-gray-200' },
  blue: { bg: 'bg-blue-50/50', border: 'border-blue-500', text: 'text-blue-600', button: 'bg-blue-600 text-white hover:bg-blue-700' },
  purple: { bg: 'bg-purple-50/50', border: 'border-purple-300', text: 'text-purple-600', button: 'bg-purple-600 text-white hover:bg-purple-700' },
  gold: { bg: 'bg-amber-50/50', border: 'border-amber-300', text: 'text-amber-600', button: 'bg-amber-600 text-white hover:bg-amber-700' },
};

export default function PublicPricingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-2xl">🎯</span>
            <span className="font-bold text-xl">销冠AI教练</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              登录
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              免费注册
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="text-center pt-16 pb-8">
        <h1 className="text-4xl font-bold mb-4">选择适合你的方案</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          从免费版开始体验，随时升级解锁更多功能
        </p>
      </section>

      {/* Plans */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const colors = colorMap[plan.color];
            return (
              <div
                key={plan.id}
                className={`relative border-2 rounded-xl p-6 transition-all hover:shadow-lg ${colors.bg} ${colors.border}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-4 py-1 rounded-full font-medium">
                    最受欢迎
                  </div>
                )}

                <div className="text-center mb-6">
                  <Icon className={`w-8 h-8 mx-auto mb-2 ${colors.text}`} />
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="text-gray-500 text-sm">{plan.nameEn}</p>
                </div>

                <div className="text-center mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-gray-500">{plan.period}</span>}
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colors.text}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigate(plan.id === 'ENTERPRISE' ? '/contact' : '/register')}
                  className={`w-full py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${colors.button}`}
                >
                  {plan.id === 'FREE' ? '免费开始' : plan.id === 'ENTERPRISE' ? '联系我们' : '立即升级'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">常见问题</h2>
          <div className="space-y-6">
            {[
              {
                q: '免费版有什么限制？',
                a: '免费版每日可生成 5 个话术、进行 3 次陪练、1 次复盘分析。知识库限制 50 条，最多安装 3 个行业插件。',
              },
              {
                q: '可以随时升级或降级吗？',
                a: '可以。升级立即生效，降级在当前计费周期结束后生效。',
              },
              {
                q: '支持哪些支付方式？',
                a: '支持信用卡、借记卡等主流支付方式，通过 Stripe 安全支付。',
              },
              {
                q: '企业版包含什么？',
                a: '企业版支持私有化部署、定制行业插件、专属客户经理、SLA 保障和数据安全审计。请联系销售获取方案。',
              },
            ].map((item, i) => (
              <div key={i} className="border-b pb-4">
                <h3 className="font-semibold mb-2">{item.q}</h3>
                <p className="text-gray-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-gray-500 text-sm">
        <p>© 2024 销冠AI教练. All rights reserved.</p>
      </footer>
    </div>
  );
}
