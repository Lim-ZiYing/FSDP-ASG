import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import StallMenu from './pages/StallMenu.jsx';
import Cart from './pages/Cart.jsx';
import BottomNav from './components/BottomNav.jsx';

export default function App() {
  return (
    <div className="app">
      <main className="screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stalls/:id" element={<StallMenu />} />
          <Route path="/cart" element={<Cart />} />
          {/* TODO: /orders, /snap, /rewards, /login */}
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
