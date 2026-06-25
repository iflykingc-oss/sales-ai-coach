import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { ErrorBoundary, RouteErrorBoundary } from './components/ErrorBoundary';
import { CommandPalette } from './components/ui/CommandPalette';
import { CookieConsent } from './components/compliance/CookieConsent';
import { UpgradeModalWrapper } from './components/payment/UpgradeModalWrapper';

/**
 * Lazy load with chunk-error recovery.
 *
 * When a deployment happens while a user has the app open, the cached HTML
 * references old chunk filenames that no longer exist. The browser throws
 * "Failed to fetch dynamically imported module". We catch this, clear the
 * service-worker cache, and hard-reload once to get the fresh HTML.
 */
function lazyWithRetry(factory: () => Promise<any>) {
  return lazy(() =>
    factory().catch((err: Error) => {
      // Only handle chunk-load errors (not syntax/runtime errors)
      const isChunkError =
        err?.message?.includes('Failed to fetch dynamically imported module') ||
        err?.message?.includes('Loading chunk') ||
        err?.message?.includes('ChunkLoadError');

      if (isChunkError) {
        const reloadKey = 'chunk-reload-pending';
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, '1');
          // Unregister all service workers and clear caches
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((regs) => {
              regs.forEach((r) => r.unregister());
            });
          }
          if ('caches' in window) {
            caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
          }
          // Small delay to let SW unregister, then reload
          setTimeout(() => window.location.reload(), 100);
        } else {
          // Already reloaded once — don't loop, just remove the flag
          sessionStorage.removeItem(reloadKey);
        }
      }
      throw err;
    })
  );
}

// Lazy load all pages for better code splitting
const LandingPage = lazyWithRetry(() => import('./app/pages/LandingPage'));
const LoginPage = lazyWithRetry(() => import('./app/pages/LoginPage'));
const RegisterPage = lazyWithRetry(() => import('./app/pages/RegisterPage'));
const DashboardPage = lazyWithRetry(() => import('./app/pages/DashboardPage'));
const SessionPage = lazyWithRetry(() => import('./app/pages/SessionPage'));
const PracticePage = lazyWithRetry(() => import('./app/pages/PracticePage'));
const KnowledgePage = lazyWithRetry(() => import('./app/pages/KnowledgePage'));
const ReviewPage = lazyWithRetry(() => import('./app/pages/ReviewPage'));
const TeamPage = lazyWithRetry(() => import('./app/pages/TeamPage'));
const PluginPage = lazyWithRetry(() => import('./app/pages/PluginPage'));
const AdminPage = lazyWithRetry(() => import('./app/pages/AdminPage'));
const AnalyticsPage = lazyWithRetry(() => import('./app/pages/AnalyticsPage'));
const DataRightsPage = lazyWithRetry(() => import('./app/pages/DataRightsPage'));
const PricingPage = lazyWithRetry(() => import('./app/pages/PricingPage'));
const PracticeHistoryPage = lazyWithRetry(() => import('./app/pages/PracticeHistoryPage'));
const PrivacyPage = lazyWithRetry(() => import('./app/pages/PrivacyPage'));
const TermsPage = lazyWithRetry(() => import('./app/pages/TermsPage'));
const PublicPricingPage = lazyWithRetry(() => import('./app/pages/PublicPricingPage'));

export default function App() {
  return (
    <>
      <ErrorBoundary>
        <Suspense fallback={<div className="flex items-center justify-center h-screen">加载中...</div>}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/pricing" element={<PublicPricingPage />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<RouteErrorBoundary><DashboardPage /></RouteErrorBoundary>} />
              <Route path="scripts" element={<RouteErrorBoundary><SessionPage /></RouteErrorBoundary>} />
              <Route path="practice" element={<RouteErrorBoundary><PracticePage /></RouteErrorBoundary>} />
              <Route path="knowledge" element={<RouteErrorBoundary><KnowledgePage /></RouteErrorBoundary>} />
              <Route path="review" element={<RouteErrorBoundary><ReviewPage /></RouteErrorBoundary>} />
              <Route path="team" element={<RouteErrorBoundary><TeamPage /></RouteErrorBoundary>} />
              <Route path="plugins" element={<RouteErrorBoundary><PluginPage /></RouteErrorBoundary>} />
              <Route path="analytics" element={<RouteErrorBoundary><AnalyticsPage /></RouteErrorBoundary>} />
              <Route path="admin" element={<RouteErrorBoundary><AdminPage /></RouteErrorBoundary>} />
              <Route path="data-rights" element={<RouteErrorBoundary><DataRightsPage /></RouteErrorBoundary>} />
              <Route path="pricing" element={<RouteErrorBoundary><PricingPage /></RouteErrorBoundary>} />
              <Route path="practice/history" element={<RouteErrorBoundary><PracticeHistoryPage /></RouteErrorBoundary>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <CommandPalette />
      <CookieConsent />
      <UpgradeModalWrapper />
    </>
  );
}
