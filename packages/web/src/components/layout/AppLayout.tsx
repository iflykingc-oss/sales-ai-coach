import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileTabBar } from './MobileTabBar';
import { ToastContainer } from '@/components/ui/Toast';
import { useUserStore } from '@/stores/userStore';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, setUser } = useUserStore();
  const navigate = useNavigate();

  // Auth guard: restore session from API on mount
  useEffect(() => {
    if (user) return; // Already have user

    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then((json) => {
        if (!cancelled && json.success && json.data?.user) {
          setUser(json.data.user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          navigate('/login', { replace: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, setUser, navigate]);

  // If no user yet (still loading), show minimal loading screen
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="mt-4 text-sm text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-0 focus:top-0 focus:z-[100] focus:rounded-b-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        跳转到主要内容
      </a>
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuToggle={() => setMobileOpen(true)} />
        <main id="main-content" className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4" role="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <MobileTabBar />
      <ToastContainer />
    </div>
  );
}
