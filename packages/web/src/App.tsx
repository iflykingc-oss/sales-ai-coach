import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CommandPalette } from './components/ui/CommandPalette';
import { CookieConsent } from './components/compliance/CookieConsent';

// Lazy load all pages for better code splitting
const LandingPage = lazy(() => import('./app/pages/LandingPage'));
const LoginPage = lazy(() => import('./app/pages/LoginPage'));
const RegisterPage = lazy(() => import('./app/pages/RegisterPage'));
const DashboardPage = lazy(() => import('./app/pages/DashboardPage'));
const SessionPage = lazy(() => import('./app/pages/SessionPage'));
const PracticePage = lazy(() => import('./app/pages/PracticePage'));
const KnowledgePage = lazy(() => import('./app/pages/KnowledgePage'));
const ReviewPage = lazy(() => import('./app/pages/ReviewPage'));
const TeamPage = lazy(() => import('./app/pages/TeamPage'));
const PluginPage = lazy(() => import('./app/pages/PluginPage'));
const AdminPage = lazy(() => import('./app/pages/AdminPage'));
const AnalyticsPage = lazy(() => import('./app/pages/AnalyticsPage'));
const DataRightsPage = lazy(() => import('./app/pages/DataRightsPage'));
const PricingPage = lazy(() => import('./app/pages/PricingPage'));
const PracticeHistoryPage = lazy(() => import('./app/pages/PracticeHistoryPage'));
const PrivacyPage = lazy(() => import('./app/pages/PrivacyPage'));
const TermsPage = lazy(() => import('./app/pages/TermsPage'));

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
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="scripts" element={<SessionPage />} />
              <Route path="practice" element={<PracticePage />} />
              <Route path="knowledge" element={<KnowledgePage />} />
              <Route path="review" element={<ReviewPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="plugins" element={<PluginPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="data-rights" element={<DataRightsPage />} />
              <Route path="pricing" element={<PricingPage />} />
              <Route path="practice/history" element={<PracticeHistoryPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <CommandPalette />
      <CookieConsent />
    </>
  );
}
