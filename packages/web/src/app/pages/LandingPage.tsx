import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Target, BarChart3, Users, ArrowRight, Globe,
  MessageSquare, ChevronDown, ChevronUp, Star, Check,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

const FEATURES = [
  {
    icon: Target,
    title: '结构化训练体系',
    titleEn: 'Structured Training System',
    desc: '基础功→进阶技能→实战模拟，循序渐进，每一步都有明确目标',
    descEn: 'Fundamentals → Advanced Skills → Simulation — step by step, clear goals at every stage',
  },
  {
    icon: MessageSquare,
    title: 'AI 话术生成',
    titleEn: 'AI Script Generation',
    desc: '描述客户场景，AI自动生成专业话术，高分话术自动归档知识库',
    descEn: 'Describe any scenario — AI generates professional scripts, high-scoring scripts auto-archived',
  },
  {
    icon: Brain,
    title: 'AI 陪练对话',
    titleEn: 'AI Practice Conversations',
    desc: '与AI客户实时对话，模拟真实场景，8维度评分，自动出报告',
    descEn: 'Real-time conversations with AI customers, 8-dimension scoring, auto-generated reports',
  },
  {
    icon: BarChart3,
    title: '自动复盘分析',
    titleEn: 'Auto Review Analysis',
    desc: '对话结束自动分析优势和待改进，给出针对性提升建议',
    descEn: 'Auto-analysis of strengths and improvements after each conversation',
  },
  {
    icon: Brain,
    title: '智能知识库',
    titleEn: 'Smart Knowledge Base',
    desc: '高分话术和练习自动归档，越练越精准',
    descEn: 'High-scoring practices auto-archived, improves with every session',
  },
  {
    icon: Users,
    title: '团队协作',
    titleEn: 'Team Collaboration',
    desc: '团队数据看板、任务分配，管理者实时掌握团队成长',
    descEn: 'Team dashboards, task assignment — managers track team growth in real-time',
  },
  {
    icon: Globe,
    title: '多语言支持',
    titleEn: 'Multi-Language Support',
    desc: '支持中文、English、ภาษาไทย、Tiếng Việt、Bahasa Melayu、Bahasa Indonesia，专为当地市场优化，最适合本地销售团队使用',
    descEn: 'Supports Chinese, English, Thai, Vietnamese, Malay, Indonesian — optimized for local markets, perfect for regional sales teams',
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
  { value: '11', label: '训练课程', labelEn: 'Training Lessons' },
  { value: '4', label: '成长阶段', labelEn: 'Growth Stages' },
  { value: '8', label: '评估维度', labelEn: 'Eval Dimensions' },
  { value: '5min', label: '首次价值', labelEn: 'Time to Value' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // 同步 i18n locale 到本地 lang 状态
  const lang = locale === 'zh' ? 'zh' : 'en';
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
            <LanguageSwitcher mode="landing" />
            <button
              onClick={() => navigate('/pricing')}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              {t('定价', 'Pricing')}
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
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-sm font-medium text-primary-700">
              <Target className="h-4 w-4" />
              {t('AI销售教练 · 结构化成长', 'AI Sales Coach · Structured Growth')}
            </div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-1.5 text-sm font-medium text-green-700">
              <Globe className="h-4 w-4" />
              🇨🇳 🇺🇸 🇹🇭 🇻🇳 🇲🇾 🇮🇩
              {t(' · 6种语言支持 · 更多开发中', ' · 6 Languages · More Coming Soon')}
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              {t(
                '你的AI销售教练，随时陪练',
                'Your AI Sales Coach, Always Ready'
              )}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 sm:text-xl">
              {t(
                '从基础功到实战模拟，AI陪练+自动复盘，帮你一步步提升销售能力',
                'From fundamentals to real-world simulation — AI practice + auto review, helping you improve step by step'
              )}
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate('/register')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:bg-primary-700 hover:shadow-xl sm:w-auto"
              >
                {t('免费开始练习', 'Start Practicing Free')}
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

      {/* Social Proof */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="text-center text-sm font-medium text-gray-400 mb-8">
            {t('受到各行业销售团队的信赖', 'Trusted by sales teams across industries')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
            {['SaaS', '医疗', '教育', '金融', '房地产', '电商'].map((industry) => (
              <div key={industry} className="flex items-center gap-2 text-gray-400">
                <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold">
                  {industry[0]}
                </div>
                <span className="text-sm font-medium">{industry}</span>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                quote: t('用了3周，成单率提升了23%', 'Used for 3 weeks, close rate improved 23%'),
                author: '李经理',
                role: t('SaaS销售主管', 'SaaS Sales Manager'),
                rating: 5,
              },
              {
                quote: t('新人培训周期从2个月缩短到2周', 'Onboarding cut from 2 months to 2 weeks'),
                author: '王总监',
                role: t('医疗行业销售总监', 'Medical Sales Director'),
                rating: 5,
              },
              {
                quote: t('AI陪练比真人Roleplay更高效', 'AI practice more efficient than roleplay'),
                author: '张总',
                role: t('教育公司创始人', 'EdTech Founder'),
                rating: 5,
              },
            ].map((testimonial, i) => (
              <div key={i} className="rounded-xl border border-gray-100 p-6 shadow-sm">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: testimonial.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">"{testimonial.quote}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-600">
                    {testimonial.author[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{testimonial.author}</p>
                    <p className="text-xs text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {t('为什么选择销冠AI教练', 'Why Choose SalesCoach AI')}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {t('不是工具，是你的销售成长教练', 'Not just a tool — your sales growth coach')}
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-gray-200 p-6 transition-all duration-300 hover:border-primary-200 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 transition-all duration-300 group-hover:bg-primary-600 group-hover:text-white group-hover:scale-110">
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
          <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-3 stagger-children">
            {PRICING.map((p) => (
              <div
                key={p.name}
                className={cn(
                  'relative rounded-2xl border bg-white p-8 transition-all duration-300 hover:-translate-y-1',
                  p.popular
                    ? 'border-primary-500 shadow-xl ring-1 ring-primary-500 hover:shadow-2xl'
                    : 'border-gray-200 hover:border-primary-200 hover:shadow-lg'
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

      {/* Trust Badges */}
      <section className="bg-gray-50 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-8">
            {[
              { icon: '🔒', label: t('数据加密', 'Data Encrypted') },
              { icon: '🛡️', label: t('隐私保护', 'Privacy Protected') },
              { icon: '⚡', label: t('99.9% 可用性', '99.9% Uptime') },
              { icon: '🌍', label: t('全球部署', 'Global Deployment') },
            ].map((badge) => (
              <div key={badge.label} className="flex items-center gap-2 text-gray-500">
                <span className="text-lg">{badge.icon}</span>
                <span className="text-sm font-medium">{badge.label}</span>
              </div>
            ))}
          </div>
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
