import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Home' },
  { to: '/orders', label: 'Orders' },
  { to: '/snap', label: 'Snap' },
  { to: '/rewards', label: 'Rewards' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end className={({ isActive }) => (isActive ? 'active' : '')}>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
