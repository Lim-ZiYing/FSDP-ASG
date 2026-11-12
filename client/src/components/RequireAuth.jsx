import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { EmptyState, LoadingCards } from './States.jsx';

// Wrap a page that needs a logged-in user.
//   <RequireAuth><Cart /></RequireAuth>
//   <RequireAuth role="hawker"><HawkerOrders /></RequireAuth>
export default function RequireAuth({ role, children }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) return <LoadingCards count={2} />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) {
    return <EmptyState icon="alert" title="You don’t have access" text="This page is for hawkers. If your role was just changed, log out and log in again." />;
  }
  return children;
}