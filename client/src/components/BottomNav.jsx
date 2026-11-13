// Owner: Zi Ying – the tab bar at the bottom of Home, Orders and Snap.
import { NavLink } from 'react-router-dom';
import { useCart } from '../cart.jsx';
import Icon from './Icon.jsx';

const TABS = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/orders', label: 'Orders', icon: 'orders' },
  { to: '/snap', label: 'Snap', icon: 'camera' },
  { to: '/cart', label: 'Cart', icon: 'cart' },
];

export default function BottomNav() {
  const { count } = useCart();
  return (
    <nav className="bottom-nav" aria-label="Main">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon name={t.icon} size={22} />
          {t.label}
          {t.to === '/cart' && count > 0 && (
            <span className="nav-badge"><span className="sr-only">, </span>{count}<span className="sr-only"> items</span></span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}