import { NavLink } from 'react-router-dom';
import { cn } from '@/utils/cn';
import {
  MessageSquare,
  Dumbbell,
  BookOpen,
  ClipboardList,
  Users,
  Puzzle,
  Settings,
  LogOut,
} from 'lucide-react';

const navItems = [
  { path: '/', icon: MessageSquare, label: '会话' },
  { path: '/practice', icon: Dumbbell, label: '陪练' },
  { path: '/knowledge', icon: BookOpen, label: '知识库' },
  { path: '/review', icon: ClipboardList, label: '复盘' },
  { path: '/team', icon: Users, label: '团队' },
  { path: '/plugins', icon: Puzzle, label: '行业插件' },
  { path: '/admin', icon: Settings, label: '管理后台' },
];

export function Sidebar() {
  return (
    <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        <h1 className="text-lg font-bold text-primary-600">销冠AI教练</h1>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-gray-200 p-2">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
          <LogOut className="h-5 w-5" />
          退出登录
        </button>
      </div>
    </aside>
  );
}
