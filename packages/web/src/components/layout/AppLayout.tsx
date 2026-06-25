import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileTabBar } from './MobileTabBar';
import { ToastContainer } from '@/components/ui/Toast';
import { useUserStore } from '@/stores/userStore';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [validated, setValidated] = useState(false);
  const { user, validateSession } = useUserStore();
  const navigate = useNavigate();

  // Validate session on mount — always check with server
  useEffect(() => {
    let cancelled = false;
    validateSession().then((valid) => {
      if (cancelled) return;
      setValidated(true);
      if (!valid) {
        navigate('/login', { replace: true });
      }
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // If not validated yet, show loading
  if (!validated || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="mt-4 text-sm text-gray-500">Loading...</p>
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
        Skip to main content
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
