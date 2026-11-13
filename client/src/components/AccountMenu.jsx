// Owner: Zi Ying – the round avatar on Home; opens a sheet with your name, receipts and Log out.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { initials } from '../format.js';
import Icon from './Icon.jsx';
import Sheet from './Sheet.jsx';

export default function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) {
    return <Link to="/login" className="btn-outline btn-sm">Log in</Link>;
  }

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <button type="button" className="avatar" onClick={() => setOpen(true)} aria-label={`Account: ${user.displayName}`} aria-haspopup="dialog">
        {initials(user.displayName)}
      </button>
      {open && (
        <Sheet title={`Hi, ${user.displayName}`} onClose={() => setOpen(false)}>
          <div className="list">
            <Link to="/orders" className="option" onClick={() => setOpen(false)}>
              <Icon name="receipt" /> <span className="grow">My orders and receipts</span> <Icon name="chevronRight" />
            </Link>
            {user.role === 'hawker' && (
              <Link to="/hawker" className="option" onClick={() => setOpen(false)}>
                <Icon name="store" /> <span className="grow">Hawker dashboard</span> <Icon name="chevronRight" />
              </Link>
            )}
            <button type="button" className="option" onClick={handleLogout}>
              <Icon name="logout" /> <span className="grow">Log out</span>
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}