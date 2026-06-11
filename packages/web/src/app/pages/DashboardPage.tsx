import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Lock, CheckCircle2, Play, Star, Target, Flame, Shield, Swords, Crown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { useUserStore } from '@/stores/userStore';
import { useI18n } from '@/i18n';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';
import { toast } from '@/hooks/useToast';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

interface DashboardData {
  stats: {
    totalScripts: number;
    totalPractices: number;
    totalReviews: number;
    weeklyScripts: number;
    weeklyPractices: number;
    avgPracticeScore: number;
  };
  pipeline: { SCRIPT: number; PRACTICE: number; REVIEW: number; CLOSED: number };
  recentSessions: Array<{ id: string; name: string; industry: string | null; stage: string; customerName: string | null; createdAt: string; _count: { scripts: number; practices: number; reviews: number } }>;
  recentPractices: Array<{ id: string; scenario: string; score: number; rounds: number; sessionId: string | null; createdAt: string }>;
}

// 成长路径 - 课程体系
const TRAINING_PATH = [
  {
    id: 'fundamentals',
    key: 'fundamentals',
    title: '基础功',
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: '掌握销售基本技能',
    lessons: [
      { id: 'opening', key: 'opening', name: '开场白训练', scenario: 'cold-call', description: '学会吸引客户注意力的开场方式' },
      { id: 'discovery', key: 'discovery', name: '需求挖掘', scenario: 'needs-analysis', description: '通过提问了解客户真实需求' },
      { id: 'presentation', key: 'presentation', name: '产品介绍', scenario: 'product-demo', description: '清晰传达产品价值和优势' },
    ],
  },
  {
    id: 'advanced',
    key: 'advanced',
    title: '进阶技能',
    icon: Shield,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: '处理复杂销售场景',
    lessons: [
      { id: 'objection', key: 'objection', name: '异议处理', scenario: 'price-negotiation', description: '有效回应客户顾虑和异议' },
      { id: 'negotiation', key: 'negotiation', name: '价格谈判', scenario: 'terms-negotiation', description: '在保护利润的同时达成共识' },
      { id: 'closing', key: 'closing', name: '促单技巧', scenario: 'urgency-close', description: '把握时机促成交易' },
    ],
  },
  {
    id: 'simulation',
    key: 'simulation',
    title: '实战模拟',
    icon: Swords,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: '完整销售流程演练',
    lessons: [
      { id: 'full-cycle', key: 'fullCycle', name: '新客户开发全流程', scenario: 'referral-visit', description: '从首次接触到成交的完整演练' },
      { id: 'renewal', key: 'renewal', name: '老客户续约谈判', scenario: 'follow-up', description: '维护关系并促成续约' },
      { id: 'enterprise', key: 'enterprise', name: '大客户攻坚', scenario: 'solution-proposal', description: '应对多方决策者的复杂销售' },
    ],
  },
  {
    id: 'challenge',
    key: 'challenge',
    title: '挑战模式',
    icon: Crown,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: '突破极限，提升能力',
    lessons: [
      { id: 'hell', key: 'hell', name: '超难客户应对', scenario: 'final-objection', description: '面对最挑剔的客户' },
      { id: 'complaint', key: 'complaint', name: '投诉处理', scenario: 'complaint-handling', description: '挽回不满客户的关系' },
    ],
  },
];

// 用户等级
const USER_LEVELS = [
  { level: 0, key: 'beginner', name: '初学者', icon: '🌱', minPractices: 0 },
  { level: 1, key: 'entry', name: '入门销售', icon: '📚', minPractices: 3 },
  { level: 2, key: 'growing', name: '成长销售', icon: '📈', minPractices: 10 },
  { level: 3, key: 'proficient', name: '熟练销售', icon: '💪', minPractices: 25 },
  { level: 4, key: 'senior', name: '资深销售', icon: '⭐', minPractices: 50 },
  { level: 5, key: 'coach', name: '销售教练', icon: '🎯', minPractices: 100 },
];

export default function DashboardPage() {
  const user = useUserStore((s) => s.user);
  const { t } = useI18n();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if this is a new user (no practices)
    const hasSeenOnboarding = localStorage.getItem('onboarding_complete');
    if (!hasSeenOnboarding && data && data.stats.totalPractices === 0) {
      setShowOnboarding(true);
    }
  }, [data]);

  useEffect(() => {
    api.get('/dashboard')
      .then((res: any) => setData(res.data))
      .catch(() => {
        toast.error(t('msg.loadingFailed'), { description: t('common.retry') });
      })
      .finally(() => setLoading(false));
  }, []);

  // 计算用户等级
  const totalPractices = data?.stats?.totalPractices || 0;
  const userLevel = useMemo(() => {
    for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
      if (totalPractices >= USER_LEVELS[i].minPractices) return USER_LEVELS[i];
    }
    return USER_LEVELS[0];
  }, [totalPractices]);

  // 计算下一等级
  const nextLevel = useMemo(() => {
    const idx = USER_LEVELS.findIndex(l => l.level === userLevel.level);
    return idx < USER_LEVELS.length - 1 ? USER_LEVELS[idx + 1] : null;
  }, [userLevel]);

  // 计算课程完成状态
  const getLessonStatus = (moduleId: string, lessonId: string) => {
    // 简化逻辑：基于练习次数判断
    const totalLessons = TRAINING_PATH.reduce((sum, m) => sum + m.lessons.length, 0);
    const completedCount = Math.min(totalPractices, totalLessons);

    let currentIndex = 0;
    for (const module of TRAINING_PATH) {
      for (const lesson of module.lessons) {
        if (module.id === moduleId && lesson.id === lessonId) {
          if (currentIndex < completedCount) return 'completed';
          if (currentIndex === completedCount) return 'current';
          return 'locked';
        }
        currentIndex++;
      }
    }
    return 'locked';
  };

  // 获取当前应该练习的课程
  const currentLesson = useMemo(() => {
    let currentIndex = 0;
    for (const module of TRAINING_PATH) {
      for (const lesson of module.lessons) {
        if (currentIndex >= totalPractices) {
          return { module, lesson };
        }
        currentIndex++;
      }
    }
    // 全部完成，返回最后一个挑战
    const lastModule = TRAINING_PATH[TRAINING_PATH.length - 1];
    return { module: lastModule, lesson: lastModule.lessons[lastModule.lessons.length - 1] };
  }, [totalPractices]);

  // 获取模块完成进度
  const getModuleProgress = (moduleId: string) => {
    const module = TRAINING_PATH.find(m => m.id === moduleId);
    if (!module) return { completed: 0, total: 0 };

    let completed = 0;
    for (const lesson of module.lessons) {
      if (getLessonStatus(moduleId, lesson.id) === 'completed') completed++;
    }
    return { completed, total: module.lessons.length };
  };

  // 检查模块是否解锁
  const isModuleUnlocked = (moduleIndex: number) => {
    if (moduleIndex === 0) return true;
    const prevModule = TRAINING_PATH[moduleIndex - 1];
    const progress = getModuleProgress(prevModule.id);
    return progress.completed >= Math.ceil(progress.total * 0.6); // 完成60%解锁下一模块
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton.Line className="h-24" />
        <Skeleton.Line className="h-48" />
        <Skeleton.Line className="h-64" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      {/* 欢迎区域 + 用户等级 */}
      <Card className="bg-gradient-to-r from-primary-50 to-blue-50 border-primary-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getGreeting()}，{user?.name || t('common.user', 'User')}
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl">{userLevel.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-700">{t(`level.${userLevel.key}`, userLevel.name)}</p>
                {nextLevel && (
                  <p className="text-xs text-gray-500">
                    {t('dashboard.level.progress', `Complete ${nextLevel.minPractices - totalPractices} more practices to reach ${nextLevel.name}`)
                      .replace('{count}', String(nextLevel.minPractices - totalPractices))
                      .replace('{level}', t(`level.${nextLevel.key}`, nextLevel.name))}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-amber-600">
              <Flame className="h-5 w-5" />
              <span className="text-lg font-bold">{totalPractices}</span>
            </div>
            <p className="text-xs text-gray-500">{t('dashboard.totalPractices')}</p>
          </div>
        </div>
        {/* 进度条 */}
        {nextLevel && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>{userLevel.name}</span>
              <span>{nextLevel.name}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (totalPractices / nextLevel.minPractices) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* 当前课程 - 快速开始 */}
      <Card className="border-2 border-primary-200 bg-primary-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <Play className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs text-primary-600 font-medium">{t('dashboard.currentLesson')}</p>
              <p className="text-lg font-bold text-gray-900">{t(`lesson.${currentLesson.lesson.key}`, currentLesson.lesson.name)}</p>
              <p className="text-sm text-gray-600">{t(`lesson.${currentLesson.lesson.key}.desc`, currentLesson.lesson.description)}</p>
            </div>
          </div>
          <Button
            onClick={() => navigate(`/app/practice?scenario=${currentLesson.lesson.scenario}&quick=true`)}
            className="px-6"
          >
            {t('dashboard.startPractice')}
          </Button>
        </div>
      </Card>

      {/* 成长路径 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary-500" />
            {t('dashboard.growthPath')}
          </h2>
          <span className="text-sm text-gray-500">
            {totalPractices} / {TRAINING_PATH.reduce((sum, m) => sum + m.lessons.length, 0)} {t('landing.stats.lessons')}
          </span>
        </div>

        <div className="space-y-4">
          {TRAINING_PATH.map((module, moduleIndex) => {
            const isUnlocked = isModuleUnlocked(moduleIndex);
            const progress = getModuleProgress(module.id);
            const isCompleted = progress.completed === progress.total;
            const ModuleIcon = module.icon;

            return (
              <Card
                key={module.id}
                className={cn(
                  'transition-all',
                  !isUnlocked && 'opacity-60',
                  isCompleted && 'border-green-200 bg-green-50/50'
                )}
              >
                {/* 模块头部 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', module.bgColor, module.color)}>
                      {isUnlocked ? (
                        <ModuleIcon className="h-5 w-5" />
                      ) : (
                        <Lock className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{t(`training.${module.key}`, module.title)}</h3>
                        {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      </div>
                      <p className="text-xs text-gray-500">{t(`training.${module.key}.desc`, module.description)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{progress.completed}/{progress.total}</p>
                    <p className="text-xs text-gray-400">{t('common.completed', 'Completed')}</p>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      isCompleted ? 'bg-green-500' : 'bg-primary-500'
                    )}
                    style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
                  />
                </div>

                {/* 课程列表 */}
                {isUnlocked && (
                  <div className="space-y-2">
                    {module.lessons.map((lesson) => {
                      const status = getLessonStatus(module.id, lesson.id);
                      return (
                        <div
                          key={lesson.id}
                          className={cn(
                            'flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors',
                            status === 'completed' && 'bg-green-50',
                            status === 'current' && 'bg-primary-50 border border-primary-200',
                            status === 'locked' && 'bg-gray-50 opacity-60',
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {status === 'completed' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : status === 'current' ? (
                              <Play className="h-5 w-5 text-primary-500" />
                            ) : (
                              <Lock className="h-4 w-4 text-gray-400" />
                            )}
                            <div>
                              <p className={cn(
                                'text-sm font-medium',
                                status === 'completed' ? 'text-green-700' :
                                status === 'current' ? 'text-primary-700' : 'text-gray-500'
                              )}>
                                {t(`lesson.${lesson.key}`, lesson.name)}
                              </p>
                              <p className="text-xs text-gray-500">{t(`lesson.${lesson.key}.desc`, lesson.description)}</p>
                            </div>
                          </div>
                          {status === 'current' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate(`/app/practice?scenario=${lesson.scenario}&quick=true`)}
                            >
                              {t('common.start', 'Start')}
                            </Button>
                          )}
                          {status === 'completed' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/app/practice?scenario=${lesson.scenario}&quick=true`)}
                            >
                              {t('summary.retry')}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 未解锁提示 */}
                {!isUnlocked && (
                  <div className="text-center py-3 text-sm text-gray-500">
                    {t('training.unlockHint', 'Complete 60% of previous module to unlock')}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* 本周成绩概览 */}
      {data?.stats && (
        <Card>
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-500" />
            {t('dashboard.weeklyStats')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{data.stats.weeklyScripts}</p>
              <p className="text-xs text-gray-500">{t('scripts.title')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{data.stats.weeklyPractices}</p>
              <p className="text-xs text-gray-500">{t('practice.title')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{data.stats.totalReviews}</p>
              <p className="text-xs text-gray-500">{t('review.title')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">
                {data.stats.avgPracticeScore > 0 ? Math.round(data.stats.avgPracticeScore) : '-'}
              </p>
              <p className="text-xs text-gray-500">{t('review.score')}</p>
            </div>
          </div>
        </Card>
      )}

      {/* 最近练习记录 */}
      {data?.recentPractices && data.recentPractices.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">{t('dashboard.recentPractices')}</h3>
            <button onClick={() => navigate('/app/practice/history')} className="text-xs text-primary-600 hover:underline">
              {t('dashboard.viewAll')}
            </button>
          </div>
          <div className="space-y-2">
            {data.recentPractices.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <div>
                  <p className="text-sm text-gray-800">{p.scenario}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(p.createdAt).toLocaleDateString()} · {p.rounds} {t('common.rounds', 'rounds')}
                  </p>
                </div>
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium',
                  p.score >= 80 ? 'bg-green-100 text-green-700' :
                  p.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                  p.score > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500',
                )}>
                  {p.score > 0 ? `${Math.round(p.score)}${t('review.score')}` : t('common.inProgress', 'In Progress')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 空状态引导 */}
      {!data?.recentPractices?.length && (
        <Card className="text-center py-8">
          <Star className="h-12 w-12 text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">{t('dashboard.empty.title')}</h3>
          <p className="text-sm text-gray-500 mb-4">{t('dashboard.empty.desc')}</p>
          <Button onClick={() => navigate(`/app/practice?scenario=${currentLesson.lesson.scenario}&quick=true`)}>
            {t('dashboard.empty.cta')}
          </Button>
        </Card>
      )}

      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard
          onComplete={() => {
            localStorage.setItem('onboarding_complete', 'true');
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}
