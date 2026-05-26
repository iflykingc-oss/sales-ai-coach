import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import SessionPage from './app/pages/SessionPage';
import PracticePage from './app/pages/PracticePage';
import KnowledgePage from './app/pages/KnowledgePage';
import ReviewPage from './app/pages/ReviewPage';
import TeamPage from './app/pages/TeamPage';
import PluginPage from './app/pages/PluginPage';
import AdminPage from './app/pages/AdminPage';
import LoginPage from './app/pages/LoginPage';
import RegisterPage from './app/pages/RegisterPage';
import { CommandPalette } from './components/ui/CommandPalette';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<SessionPage />} />
          <Route path="practice" element={<PracticePage />} />
          <Route path="knowledge" element={<KnowledgePage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="plugins" element={<PluginPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CommandPalette />
    </>
  );
}
