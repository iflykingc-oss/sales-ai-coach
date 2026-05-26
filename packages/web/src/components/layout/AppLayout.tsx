import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
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
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4" role="main">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
