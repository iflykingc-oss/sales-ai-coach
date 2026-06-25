import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import {
  Home,
  MessageSquare,
  Dumbbell,
  BookOpen,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Crown,
} from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import { toast } from '@/hooks/useToast';

function useNavItems() {
  const { t } = useTranslation('layout');
  return [
    { path: '/app', icon: Home, label: t('sidebar.home'), end: true },
    { path: '/app/scripts', icon: MessageSquare, label: t('sidebar.scripts'), end: false },
    { path: '/app/practice', icon: Dumbbell, label: t('sidebar.practice'), end: false },
    { path: '/app/knowledge', icon: BookOpen, label: t('sidebar.knowledge'), end: false },
    { path: '/app/review', icon: ClipboardList, label: t('sidebar.review'), end: false },
    { path: '/app/analytics', icon: BarChart3, label: t('sidebar.analytics'), end: false },
    { path: '/app/team', icon: Users, label: t('sidebar.team'), end: false },
    { path: '/app/admin', icon: Settings, label: t('sidebar.admin'), end: false },
  ];
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const navigate = useNavigate();
  const { user, clearUser } = useUserStore();
  const { t } = useTranslation('layout');
  const navItems = useNavItems();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Even if API fails, still clear local state
    }
    clearUser();
    toast.info(t('sidebar.loggedOut'));
    navigate('/login');
  };

  const handleNavClick = () => {
    onMobileClose?.();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <aside
        id="sidebar-navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r border-gray-200 bg-white transition-transform duration-200 md:relative md:z-auto md:w-56 md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        role="navigation"
        aria-label={t('sidebar.ariaMainNav')}
      >
        <div className="flex h-14 items-center border-b border-gray-200 px-4">
          <h1 className="text-lg font-bold text-primary-600">销冠AI教练</h1>
        </div>
        <nav className="flex-1 space-y-1 p-2" aria-label={t('sidebar.ariaNavMenu')}>
          {navItems.map(({ path, icon: Icon, label, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              onClick={handleNavClick}
            >
              {({ isActive }) => (
                <span
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {label}
                  {isActive && <span className="sr-only">{t('common:sidebar.currentpage')}</span>}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-2">
          {user && (
            <div className="mb-1 px-3 py-2">
              <p className="text-sm font-medium text-gray-700">{user.name}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          )}
          {/* Plan badge */}
          <NavLink
            to="/app/pricing"
            onClick={handleNavClick}
            className="mx-2 mb-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm transition-colors hover:bg-amber-100"
          >
            <Crown className="h-4 w-4 text-amber-600" />
            <div className="flex-1">
              <span className="font-medium text-amber-800">
                {user?.plan === 'FREE' ? t('common:free') : user?.plan === 'PROFESSIONAL' ? t('common:professional') : user?.plan === 'TEAM' ? t('common:team') : user?.plan === 'ENTERPRISE' ? t('common:enterprise') : t('common:free')}
              </span>
              {user?.plan === 'FREE' && (
                <span className="ml-2 text-xs text-amber-600">{t('common:upgrade')} →</span>
              )}
            </div>
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-red-600"
            aria-label={t('sidebar.logout')}
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            {t('sidebar.logout')}
          </button>
        </div>
      </aside>
    </>
  );
}
