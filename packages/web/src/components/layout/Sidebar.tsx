import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import {
  MessageSquare,
  Dumbbell,
  BookOpen,
  ClipboardList,
  BarChart3,
  Users,
  Puzzle,
  Settings,
  LogOut,
} from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import { toast } from '@/hooks/useToast';

const navItems = [
  { path: '/app', icon: MessageSquare, label: '会话' },
  { path: '/app/practice', icon: Dumbbell, label: '陪练' },
  { path: '/app/knowledge', icon: BookOpen, label: '知识库' },
  { path: '/app/review', icon: ClipboardList, label: '复盘' },
  { path: '/app/analytics', icon: BarChart3, label: '数据分析' },
  { path: '/app/team', icon: Users, label: '团队' },
  { path: '/app/plugins', icon: Puzzle, label: '行业插件' },
  { path: '/app/admin', icon: Settings, label: '管理后台' },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const navigate = useNavigate();
  const { user, clearUser } = useUserStore();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Even if API fails, still clear local state
    }
    clearUser();
    toast.info('已退出登录');
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
        aria-label="主导航"
      >
        <div className="flex h-14 items-center border-b border-gray-200 px-4">
          <h1 className="text-lg font-bold text-primary-600">销冠AI教练</h1>
        </div>
        <nav className="flex-1 space-y-1 p-2" aria-label="导航菜单">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/app'}
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
                  {isActive && <span className="sr-only">(当前页面)</span>}
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
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-red-600"
            aria-label="退出登录"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            退出登录
          </button>
        </div>
      </aside>
    </>
  );
}
