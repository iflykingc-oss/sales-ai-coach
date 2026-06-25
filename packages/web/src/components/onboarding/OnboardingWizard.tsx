import { useState } from 'react';
import { Target, BookOpen, Dumbbell, Shield, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/i18n';
import { cn } from '@/utils/cn';

interface OnboardingStep {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  icon: React.ReactNode;
}

const STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '欢迎使用销冠AI教练',
    titleEn: 'Welcome to SalesCoach AI',
    description: '你的AI销售教练，随时陪你练习，帮你一步步提升销售能力。',
    descriptionEn: 'Your AI sales coach, always ready to practice with you and help you improve step by step.',
    icon: <Target className="h-8 w-8 text-primary-500" />,
  },
  {
    id: 'features',
    title: '核心功能',
    titleEn: 'Core Features',
    description: '话术生成：描述场景，AI自动生成专业话术\nAI陪练：与AI客户实时对话，8维度评分\n自动复盘：对话结束自动分析优势和待改进',
    descriptionEn: 'Script Generation: Describe a scenario, AI generates professional scripts\nAI Practice: Real-time conversations with AI customers, 8-dimension scoring\nAuto Review: Automatic analysis of strengths and improvements after each conversation',
    icon: <BookOpen className="h-8 w-8 text-primary-500" />,
  },
  {
    id: 'path',
    title: '成长路径',
    titleEn: 'Growth Path',
    description: '基础功 → 进阶技能 → 实战模拟 → 挑战模式\n\n从开场白训练开始，逐步掌握异议处理、价格谈判、促单技巧，最终成为销售高手。',
    descriptionEn: 'Fundamentals → Advanced Skills → Simulation → Challenge\n\nStart with opening techniques, then master objection handling, negotiation, and closing skills.',
    icon: <Dumbbell className="h-8 w-8 text-primary-500" />,
  },
  {
    id: 'privacy',
    title: '数据安全',
    titleEn: 'Data Privacy',
    description: '您的数据由您掌控：\n• 练习和话术默认仅在当前会话有效\n• 您可以随时保存到账号、导出备份\n• 上传的知识库仅用于为您服务，平台无法查看\n• 您可随时一键删除所有数据',
    descriptionEn: 'Your data, your control:\n• Practice and scripts are ephemeral by default\n• Save to account or export anytime\n• Uploaded knowledge is private and deletable\n• One-click data deletion available',
    icon: <Shield className="h-8 w-8 text-primary-500" />,
  },
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { locale } = useI18n();
  const t = (zh: string, en: string) => locale === 'zh' ? zh : en;

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
        {/* Progress */}
        <div className="mb-6 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-2 w-8 rounded-full transition-colors',
                i <= currentStep ? 'bg-primary-500' : 'bg-gray-200'
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">{step.icon}</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {t(step.title, step.titleEn)}
          </h2>
          <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
            {t(step.description, step.descriptionEn)}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          {currentStep > 0 ? (
            <Button variant="ghost" onClick={() => setCurrentStep(currentStep - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('上一步', 'Back')}
            </Button>
          ) : (
            <div />
          )}
          {isLast ? (
            <Button onClick={onComplete}>
              {t('开始练习', 'Start Practicing')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => setCurrentStep(currentStep + 1)}>
              {t('下一步', 'Next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Skip */}
        <div className="mt-4 text-center">
          <button
            onClick={onComplete}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {t('跳过引导', 'Skip intro')}
          </button>
        </div>
      </div>
    </div>
  );
}
