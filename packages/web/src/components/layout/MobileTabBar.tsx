import { NavLink } from 'react-router-dom';
import { MessageSquare, Dumbbell, BookOpen, BarChart3, MoreHorizontal } from 'lucide-react';
import { cn } from '@/utils/cn';

const tabs = [
  { path: '/app', icon: MessageSquare, label: '会话', end: true },
  { path: '/app/practice', icon: Dumbbell, label: '陪练', end: false },
  { path: '/app/knowledge', icon: BookOpen, label: '知识', end: false },
  { path: '/app/analytics', icon: BarChart3, label: '数据', end: false },
  { path: '/app/team', icon: MoreHorizontal, label: '更多', end: false },
];

export function MobileTabBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white md:hidden"
      aria-label="移动端导航"
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
