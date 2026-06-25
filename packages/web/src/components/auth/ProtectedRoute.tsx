import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../stores/userStore';

/**
 * Route-level auth guard. Redirects to /login if not authenticated.
 * Prevents the flash of loading state that component-level checks cause.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useUserStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * Route-level admin guard. Redirects to /app if not admin.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useUserStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
