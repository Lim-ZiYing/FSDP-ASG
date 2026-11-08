import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import BottomNav from './components/BottomNav.jsx';

// Zi Ying
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import HawkerOrders from './pages/HawkerOrders.jsx';
import TrackOrder from './pages/TrackOrder.jsx';
// Siyu
import Home from './pages/Home.jsx';
import StallMenu from './pages/StallMenu.jsx';
import DishPage from './pages/DishPage.jsx';
// Lennox
import Cart from './pages/Cart.jsx';
import PickupTime from './pages/PickupTime.jsx';
import OrderHistory from './pages/OrderHistory.jsx';
// Declan
import Payment from './pages/Payment.jsx';
import OrderConfirmed from './pages/OrderConfirmed.jsx';
// Dana
import UploadPhoto from './pages/UploadPhoto.jsx';

// Pages that hide the top bar and bottom nav
const FULL_SCREEN_PAGES = ['/login', '/signup'];

export default function App() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const fullScreen = FULL_SCREEN_PAGES.includes(location.pathname);
  const onHawkerPage = location.pathname.startsWith('/hawker');

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app">
      {user && !fullScreen && (
        <header className="top-bar">
          <span className="muted">Hi, {user.displayName}</span>
          <button type="button" className="link-btn" onClick={handleLogout}>Log out</button>
        </header>
      )}

      <main className="screen">
        <Routes>
          {/* Zi Ying */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/hawker" element={<RequireAuth role="hawker"><HawkerOrders /></RequireAuth>} />
          <Route path="/orders/:orderId/track" element={<RequireAuth><TrackOrder /></RequireAuth>} />

          {/* Siyu */}
          <Route path="/" element={<Home />} />
          <Route path="/stalls/:id" element={<StallMenu />} />
          <Route path="/dishes/:itemId" element={<DishPage />} />

          {/* Lennox */}
          <Route path="/cart" element={<RequireAuth><Cart /></RequireAuth>} />
          <Route path="/pickup" element={<RequireAuth><PickupTime /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><OrderHistory /></RequireAuth>} />

          {/* Declan */}
          <Route path="/pay/:orderId" element={<RequireAuth><Payment /></RequireAuth>} />
          <Route path="/orders/:orderId/confirmed" element={<RequireAuth><OrderConfirmed /></RequireAuth>} />

          {/* Dana */}
          <Route path="/snap" element={<RequireAuth><UploadPhoto /></RequireAuth>} />
          <Route path="/dishes/:itemId/upload" element={<RequireAuth><UploadPhoto /></RequireAuth>} />

          <Route path="*" element={<p className="muted">Page not found.</p>} />
        </Routes>
      </main>

      {!fullScreen && !onHawkerPage && <BottomNav />}
    </div>
  );
}
