import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

// Wrap a page that needs a logged-in user.
//   <RequireAuth><Cart /></RequireAuth>
//   <RequireAuth role="hawker"><HawkerOrders /></RequireAuth>
export default function RequireAuth({ role, children }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) {
    return <p className="error">You don’t have access to this page.</p>;
  }
  return children;
}
