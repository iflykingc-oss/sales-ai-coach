import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Brain, Target, BarChart3, Users, Globe, ArrowRight,
  MessageSquare, ChevronDown, ChevronUp, Star, Check,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'AI 话术生成',
    titleEn: 'AI Script Generation',
    desc: '输入客户场景，AI 即时生成共情版、直爽版、专业版三种风格话术，附带避坑提醒和引用来源',
    descEn: 'Input any customer scenario — AI instantly generates 3 speech styles with pitfall alerts and source citations',
  },
  {
    icon: Target,
    title: 'AI 陪练系统',
    titleEn: 'AI Practice System',
    desc: '模拟真实客户对话，8维度实时评分，情绪追踪，自动生成复盘报告',
    descEn: 'Simulate real customer conversations with 8-dimension scoring, emotion tracking, and auto-generated reviews',
  },
  {
    icon: Brain,
    title: '自进化知识库',
    titleEn: 'Self-Evolving Knowledge Base',
    desc: '好评话术自动沉淀，智能检索去重，用户反馈驱动权重调整',
    descEn: 'Top-rated scripts auto-archived, smart dedup, feedback-driven weight optimization',
  },
  {
    icon: BarChart3,
    title: '每日实战复盘',
    titleEn: 'Daily Battle Review',
    desc: '一键分析对话成败点，生成成长档案和8维度能力雷达图',
    descEn: 'One-click analysis of wins and losses, growth profiles and 8-dimension radar charts',
  },
  {
    icon: Users,
    title: '团队管理',
    titleEn: 'Team Management',
    desc: '团队数据看板、任务分配、优质话术共享、新人7天/30天培养计划',
    descEn: 'Team dashboards, task assignment, script sharing, 7/30-day newcomer training plans',
  },
  {
    icon: Globe,
    title: '52个行业插件',
    titleEn: '52 Industry Plugins',
    desc: '覆盖国内外主流行业，每个插件预置200+话术和5-8个专属场景',
    descEn: 'Covering global industries, each plugin ships with 200+ scripts and 5-8 dedicated scenarios',
  },
];

const PRICING = [
  {
    name: '免费版',
    nameEn: 'Free',
    price: '¥0',
    priceEn: '$0',
    period: '/月 /month',
    features: ['每日5次话术生成', '基础陪练模式', '个人知识库(100条)', '1个行业插件'],
    featuresEn: ['5 scripts/day', 'Basic practice mode', 'Personal KB (100 items)', '1 industry plugin'],
    cta: '免费开始',
    ctaEn: 'Get Started Free',
    popular: false,
  },
  {
    name: '专业版',
    nameEn: 'Professional',
    price: '¥99',
    priceEn: '$29',
    period: '/月 /month',
    features: ['无限话术生成', '全模式陪练+复盘', '知识库无限制', '3个行业插件', '成长档案追踪'],
    featuresEn: ['Unlimited scripts', 'Full practice + review', 'Unlimited knowledge base', '3 industry plugins', 'Growth tracking'],
    cta: '开始试用',
    ctaEn: 'Start Trial',
    popular: true,
  },
  {
    name: '团队版',
    nameEn: 'Team',
    price: '¥299',
    priceEn: '$79',
    period: '/人/月 /user/mo',
    features: ['专业版全部功能', '团队数据看板', '任务分配与追踪', '优质话术共享', '新人培训体系'],
    featuresEn: ['Everything in Pro', 'Team dashboards', 'Task assignment & tracking', 'Script sharing', 'Newcomer training'],
    cta: '联系销售',
    ctaEn: 'Contact Sales',
    popular: false,
  },
];

const STATS = [
  { value: '52', label: '行业插件', labelEn: 'Industry Plugins' },
  { value: '10,000+', label: '预置话术', labelEn: 'Pre-built Scripts' },
  { value: '8', label: '评估维度', labelEn: 'Eval Dimensions' },
  { value: '40%', label: '成单率提升', labelEn: 'Close Rate Boost' },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);

  const FAQS = [
    {
      q: t('支持哪些行业？', 'Which industries are supported?'),
      a: t(
        '目前支持52个行业，涵盖国内28个（SaaS、医疗、教育、房地产、金融等）和海外24个（跨境电商、全球SaaS、医疗健康等）。每个行业都有专属话术库和陪练场景。',
        'We support 52 industries: 28 domestic (SaaS, Medical, Education, Real Estate, Finance, etc.) and 24 overseas (Cross-border E-commerce, Global SaaS, Healthcare, etc.). Each comes with dedicated scripts and practice scenarios.'
      ),
    },
    {
      q: t('AI 话术生成的原理是什么？', 'How does AI script generation work?'),
      a: t(
        '基于大语言模型，结合行业知识库、个人话术库和销售逻辑框架（预期同步法、差距分析法等），生成可直接使用的多风格话术，并附带避坑提醒。',
        'Powered by LLMs, combined with industry knowledge bases, personal script libraries, and sales logic frameworks to generate ready-to-use multi-style scripts with pitfall alerts.'
      ),
    },
    {
      q: t('数据安全如何保障？', 'How is data security ensured?'),
      a: t(
        '所有数据加密存储，不同行业数据隔离。支持数据备份与恢复，API密钥加密管理。',
        'All data encrypted at rest, industry data isolated. Supports backup/restore and encrypted API key management.'
      ),
    },
    {
      q: t('可以免费试用吗？', 'Can I try for free?'),
      a: t(
        '可以！免费版包含每日5次话术生成、基础陪练和1个行业插件，无需信用卡即可注册。',
        'Yes! Free tier includes 5 daily scripts, basic practice, and 1 industry plugin. No credit card required.'
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white">
              销
            </div>
            <span className="text-lg font-bold text-gray-900">
              {t('销冠AI教练', 'SalesCoach AI')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100"
            >
              {lang === 'zh' ? 'EN' : '中文'}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              {t('登录', 'Log In')}
            </button>
            <button
              onClick={() => navigate('/register')}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
            >
              {t('免费注册', 'Sign Up Free')}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-indigo-50" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-sm font-medium text-primary-700">
              <Zap className="h-4 w-4" />
              {t('52个行业插件 · 10000+预置话术', '52 Industry Plugins · 10,000+ Pre-built Scripts')}
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              {t(
                '让每个销售都能成为销冠',
                'Turn Every Salesperson Into a Top Performer'
              )}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 sm:text-xl">
              {t(
                'AI 实时话术生成 · 模拟陪练 · 自动复盘 · 知识沉淀 — 覆盖从初次接触到关单的全流程',
                'AI Real-time Script Generation · Practice Simulation · Auto Review · Knowledge Capture — covering the full sales cycle from first contact to close'
              )}
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate('/register')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:bg-primary-700 hover:shadow-xl sm:w-auto"
              >
                {t('免费开始使用', 'Get Started Free')}
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
              >
                {t('了解更多', 'Learn More')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-100 bg-gray-50">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-extrabold text-primary-600 sm:text-4xl">{s.value}</div>
              <div className="mt-1 text-sm text-gray-500">{t(s.label, s.labelEn)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {t('核心功能', 'Core Features')}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {t('从话术生成到团队管理，一站式销售赋能平台', 'From script generation to team management — a one-stop sales enablement platform')}
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-gray-200 p-6 transition hover:border-primary-200 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 transition group-hover:bg-primary-600 group-hover:text-white">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900">{t(f.title, f.titleEn)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{t(f.desc, f.descEn)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              {t('三步开始', 'Get Started in 3 Steps')}
            </h2>
          </div>
          <div className="mx-auto mt-16 grid max-w-4xl gap-8 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: t('选择行业', 'Choose Industry'),
                desc: t('注册后选择你的行业，自动安装行业插件包', 'Select your industry on signup — plugin auto-installs'),
              },
              {
                step: '2',
                title: t('输入场景', 'Input Scenario'),
                desc: t('粘贴客户对话或描述场景，AI实时生成话术', 'Paste a conversation or describe a scenario — AI generates scripts instantly'),
              },
              {
                step: '3',
                title: t('复制使用', 'Copy & Use'),
                desc: t('一键复制话术发给客户，好评自动沉淀到知识库', 'One-click copy to send, positive feedback auto-archived to your knowledge base'),
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-xl font-bold text-white">
                  {s.step}
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Plugins Showcase */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {t('覆盖全球52个行业', 'Covering 52 Industries Worldwide')}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {t('每个行业插件包含200+专属话术和5-8个实战场景', 'Each plugin ships with 200+ dedicated scripts and 5-8 practice scenarios')}
          </p>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[
            { icon: '💻', label: t('SaaS软件', 'SaaS') },
            { icon: '🏥', label: t('医疗器械', 'Medical Devices') },
            { icon: '🎓', label: t('教育培训', 'Education') },
            { icon: '🏠', label: t('房地产', 'Real Estate') },
            { icon: '💰', label: t('金融理财', 'Finance') },
            { icon: '🚗', label: t('汽车销售', 'Automotive') },
            { icon: '🛡️', label: t('保险', 'Insurance') },
            { icon: '⚖️', label: t('法律服务', 'Legal') },
            { icon: '🏗️', label: t('建筑工程', 'Construction') },
            { icon: '🛒', label: t('跨境电商', 'Cross-border E-com') },
            { icon: '🌐', label: t('全球SaaS', 'Global SaaS') },
            { icon: '💊', label: t('医疗健康', 'Healthcare') },
          ].map((ind) => (
            <div
              key={ind.label}
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 transition hover:border-primary-300 hover:shadow-md"
            >
              <span className="text-2xl">{ind.icon}</span>
              <span className="text-xs font-medium text-gray-700">{ind.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <span className="text-sm text-gray-500">
            {t('...以及另外40个行业插件', '...and 40 more industry plugins')}
          </span>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              {t('简单透明的定价', 'Simple, Transparent Pricing')}
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              {t('从免费开始，按需升级', 'Start free, upgrade as you grow')}
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-3">
            {PRICING.map((p) => (
              <div
                key={p.name}
                className={cn(
                  'relative rounded-2xl border bg-white p-8',
                  p.popular
                    ? 'border-primary-500 shadow-xl ring-1 ring-primary-500'
                    : 'border-gray-200'
                )}
              >
                {p.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-4 py-1 text-xs font-semibold text-white">
                      <Star className="h-3 w-3" />
                      {t('最受欢迎', 'Most Popular')}
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-bold text-gray-900">{t(p.name, p.nameEn)}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">{t(p.price, p.priceEn)}</span>
                  <span className="text-sm text-gray-500">{p.period}</span>
                </div>
                <ul className="mt-8 space-y-3">
                  {(lang === 'zh' ? p.features : p.featuresEn).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/register')}
                  className={cn(
                    'mt-8 w-full rounded-xl py-3 text-sm font-semibold transition',
                    p.popular
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  )}
                >
                  {t(p.cta, p.ctaEn)}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:py-24">
        <h2 className="text-center text-3xl font-extrabold text-gray-900 sm:text-4xl">
          {t('常见问题', 'FAQ')}
        </h2>
        <div className="mt-12 space-y-4">
          {FAQS.map((faq, i) => (
            <div key={i} className="rounded-xl border border-gray-200">
              <button
                className="flex w-full items-center justify-between px-6 py-4 text-left"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="font-medium text-gray-900">{faq.q}</span>
                {openFaq === i ? (
                  <ChevronUp className="h-5 w-5 shrink-0 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" />
                )}
              </button>
              {openFaq === i && (
                <div className="border-t border-gray-100 px-6 py-4 text-sm text-gray-600">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-600">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            {t('准备好提升你的销售团队了吗？', 'Ready to Level Up Your Sales Team?')}
          </h2>
          <p className="mt-4 text-lg text-primary-100">
            {t('免费注册，立即体验AI销售教练', 'Sign up free and experience the AI sales coach today')}
          </p>
          <button
            onClick={() => navigate('/register')}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-primary-700 shadow-lg transition hover:bg-primary-50"
          >
            {t('免费开始', 'Get Started Free')}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-xs font-bold text-white">
                销
              </div>
              <span className="font-bold text-gray-900">{t('销冠AI教练', 'SalesCoach AI')}</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <a href="#features" className="hover:text-gray-900">{t('功能', 'Features')}</a>
              <a href="#pricing" className="hover:text-gray-900">{t('定价', 'Pricing')}</a>
              <button onClick={() => navigate('/login')} className="hover:text-gray-900">{t('登录', 'Login')}</button>
            </div>
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} SalesCoach AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
