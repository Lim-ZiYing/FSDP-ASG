// Owner: Siyu – FSDP-12 stall eMenu with photos and prices · Lennox – FSDP-65 add to cart
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useCart } from '../cart.jsx';
import { formatMoney } from '../format.js';
import MenuItemCard from '../components/MenuItemCard.jsx';
import FoodImage from '../components/FoodImage.jsx';
import QueuePill from '../components/QueuePill.jsx';
import Icon from '../components/Icon.jsx';
import { EmptyState, ErrorState, LoadingCards } from '../components/States.jsx';
import './Browse.css';

export default function StallMenu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const [stall, setStall] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [toast, setToast] = useState('');

  const load = useCallback(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    Promise.all([api.getStall(id), api.getMenu(id)])
      .then(([s, m]) => { if (!ignore) { setStall(s); setItems(m); } })
      .catch((e) => {
        if (!ignore) setError(e.status === 404 ? 'We couldn’t find that stall.' : 'Couldn’t load the menu. Check your connection and try again.');
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [id]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  function addToCart(item) {
    cart.add(item, stall, 1);
    setToast(`Added ${item.name}`);
  }

  const categories = ['All', ...new Set(items.map((i) => i.category || 'Menu'))];
  const shown = category === 'All' ? items : items.filter((i) => (i.category || 'Menu') === category);

  return (
    <>
      <div className="hero">
        <FoodImage src={stall?.photoUrl} className="" />
        <div className="hero-actions">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)} aria-label="Go back"><Icon name="back" /></button>
        </div>
      </div>

      {loading && !stall && <div className="hero-card"><LoadingCards count={1} /></div>}
      {error && <div className="hero-card"><ErrorState message={error} onRetry={load} /></div>}

      {stall && (
        <div className="hero-card">
          <h1>{stall.name}</h1>
          <p className="muted">{[stall.cuisine, stall.unitNo].filter(Boolean).join(' · ')}</p>
          <div className="pills">
            <QueuePill minutes={stall.estimatedMinutes} isOpen={stall.isOpen} />
            {stall.acceptsCdc && <span className="pill cdc">CDC accepted</span>}
          </div>
          {stall.isOpen && stall.ordersAhead > 0 && (
            <p className="muted small stall-ahead">{stall.ordersAhead} {stall.ordersAhead === 1 ? 'order' : 'orders'} ahead of you</p>
          )}
        </div>
      )}

      {stall && !stall.isOpen && (
        <p className="notice notice-amber menu-notice"><Icon name="info" /> This stall is closed right now. You can still look at the menu.</p>
      )}

      {items.length > 0 && categories.length > 2 && (
        <div className="chips menu-tabs" role="group" aria-label="Menu sections">
          {categories.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && <EmptyState title="No dishes yet" text="This stall hasn’t added its menu." />}

      <div className="list menu-list">
        {shown.map((item) => (
          <MenuItemCard key={item.id} item={item} inCart={cart.quantityOf(item.id)} onAdd={stall?.isOpen ? addToCart : undefined} />
        ))}
      </div>

      {toast && <div className="toast" role="status"><Icon name="check" size={16} /> {toast}</div>}

      {cart.count > 0 && (
        <Link to="/cart" className="floating-cart">
          <span className="count-badge">{cart.count}</span>
          <span className="grow">View cart{cart.byStall.length > 1 ? ` · ${cart.byStall.length} stalls` : ''}</span>
          <span>{formatMoney(cart.totalCents)}</span>
          <Icon name="chevronRight" />
        </Link>
      )}
    </>
  );
}