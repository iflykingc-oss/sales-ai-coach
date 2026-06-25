import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Dumbbell, BookOpen, BarChart3, MoreHorizontal } from 'lucide-react';
import { cn } from '@/utils/cn';

export function MobileTabBar() {
  const { t } = useTranslation('layout');
  const tabs = [
    { path: '/app', icon: MessageSquare, label: t('mobile.sessions'), end: true },
    { path: '/app/practice', icon: Dumbbell, label: t('mobile.practice'), end: false },
    { path: '/app/knowledge', icon: BookOpen, label: t('mobile.knowledge'), end: false },
    { path: '/app/analytics', icon: BarChart3, label: t('mobile.analytics'), end: false },
    { path: '/app/team', icon: MoreHorizontal, label: t('mobile.more'), end: false },
  ];
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white md:hidden"
      aria-label={t('mobile.ariaLabel')}
    >
      <div className="flex items-center justify-around px-2 py-1">
        {tabs.map(({ path, icon: Icon, label, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className="flex-1"
          >
            {({ isActive }) => (
              <div
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg py-1.5 transition-colors',
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-400 active:text-gray-600',
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'scale-110')} />
                <span className="text-[10px] font-medium">{label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
      {/* Safe area inset for iPhone notch */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
