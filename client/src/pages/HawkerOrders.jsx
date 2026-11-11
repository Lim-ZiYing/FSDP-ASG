// Owner: Zi Ying – FSDP-50 incoming orders, FSDP-51 update status, FSDP-39 hawker role,
//                  FSDP-53 mark a dish sold out
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { usePolling } from '../usePolling.js';
import { formatMoney, formatTime } from '../format.js';
import Icon from '../components/Icon.jsx';
import { EmptyState, ErrorState, LoadingCards } from '../components/States.jsx';
import './LiveOrders.css';

const REFRESH_MS = 5000;

const TABS = [
  { key: 'paid', label: 'New' },
  { key: 'preparing', label: 'Cooking' },
  { key: 'ready', label: 'Ready' },
  { key: 'menu', label: 'Menu' },
];

const ACTION = {
  preparing: { label: 'Start preparing', icon: 'zap', className: 'btn-dark' },
  ready: { label: 'Mark ready', icon: 'bell', className: 'btn-primary' },
  collected: { label: 'Collected', icon: 'check', className: 'btn-outline' },
};

export default function HawkerOrders() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [stalls, setStalls] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('paid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [newIds, setNewIds] = useState(new Set());
  const seenIds = useRef(null); // ids from the previous refresh, to spot new orders

  const load = useCallback(async () => {
    try {
      const data = await api.hawkerOrders();
      const ids = data.orders.map((o) => o.id);
      if (seenIds.current) {
        const fresh = ids.filter((id) => !seenIds.current.has(id));
        if (fresh.length) setNewIds((prev) => new Set([...prev, ...fresh]));
      }
      seenIds.current = new Set(ids);
      setStalls(data.stalls);
      setOrders(data.orders);
      setUpdatedAt(new Date());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(load, REFRESH_MS);

  async function advance(card) {
    setActionError('');
    setBusyId(card.id);
    try {
      await api.updateStallOrderStatus(card.id, card.nextStatus);
      setNewIds((prev) => {
        const next = new Set(prev);
        next.delete(card.id);
        return next;
      });
      await load();
    } catch (err) {
      setActionError(`${card.order.orderNo}: ${err.message}`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const counts = Object.fromEntries(TABS.map((t) => [t.key, orders.filter((o) => o.status === t.key).length]));
  const shown = orders.filter((o) => o.status === tab);

  return (
    <>
      <header className="hawker-head">
        <div className="between">
          <p className="eyebrow">{stalls.map((s) => `${s.name}${s.unitNo ? ` · ${s.unitNo}` : ''}`).join(', ') || 'Hawker'}</p>
          <button type="button" className="icon-btn" onClick={handleLogout} aria-label="Log out"><Icon name="logout" size={18} /></button>
        </div>
        <h1>{tab === 'menu' ? 'Menu' : 'Incoming orders'}</h1>
        <p className="live-note" aria-live="polite">
          <span className="live-dot" aria-hidden="true" /> Live
          {updatedAt && <> · updated {updatedAt.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</>}
          {error && orders.length > 0 && <> · connection problem, retrying</>}
        </p>
      </header>

      {loading && <LoadingCards count={3} />}
      {!loading && error && orders.length === 0 && stalls.length === 0 && <ErrorState message={`Couldn’t load orders: ${error}`} onRetry={load} />}
      {!loading && !error && stalls.length === 0 && (
        <EmptyState icon="store" title="No stall linked yet" text="Your account isn’t linked to a stall. Ask the team to set your stall’s owner to you." />
      )}

      {!loading && stalls.length > 0 && (
        <>
          <div className="tabs" role="tablist" aria-label="Orders and menu">
            {TABS.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
                className={`tab ${tab === t.key ? 'tab-active' : ''}`} onClick={() => setTab(t.key)}>
                {t.label} {t.key !== 'menu' && <span className="tab-count">{counts[t.key]}</span>}
              </button>
            ))}
          </div>

          {actionError && <p className="notice notice-red" role="alert"><Icon name="alert" /> {actionError}</p>}

          {tab === 'menu' ? (
            <MenuTab />
          ) : shown.length === 0 ? (
            <EmptyState icon="orders" title={tab === 'paid' ? 'No new orders' : 'Nothing here right now'}
              text={tab === 'paid' ? 'Paid orders appear here automatically.' : undefined} />
          ) : (
            <div className="list">
              {shown.map((card) => {
                const action = ACTION[card.nextStatus];
                const isNew = newIds.has(card.id);
                return (
                  <article key={card.id} className={`card order-card ${isNew || card.status === 'paid' ? 'is-new' : `is-${card.status}`}`}>
                    <div className="order-head">
                      <h3>{card.order.orderNo}</h3>
                      {isNew && <span className="pill pill-new">New</span>}
                      <span className="pickup">
                        <Icon name={card.order.asap ? 'zap' : 'clock'} size={15} />
                        {card.order.asap ? `ASAP · ${formatTime(card.order.createdAt)}` : `Pick up ${formatTime(card.order.pickupTime)}`}
                      </span>
                    </div>
                    <p className="muted">
                      {card.order.customerName}
                      {card.order.collectionPoint && ` · ${card.order.collectionPoint}`}
                      {card.subtotalCents != null && ` · ${formatMoney(card.subtotalCents)}`}
                    </p>
                    <ul className="order-items">
                      {card.items.map((item) => (
                        <li key={item.id}>
                          <strong>{item.quantity} ×</strong> {item.name}
                          {item.notes && <span className="item-note"> – {item.notes}</span>}
                        </li>
                      ))}
                    </ul>
                    {card.order.stallCount > 1 && card.status !== 'ready' && (
                      <p className="multi-note">Part of a {card.order.stallCount}-stall order{card.estimatedReadyAt && ` · aim for ${formatTime(card.estimatedReadyAt)}`}</p>
                    )}
                    {action && (
                      <button type="button" className={action.className} disabled={busyId === card.id} onClick={() => advance(card)}>
                        <Icon name={action.icon} /> {busyId === card.id ? 'Updating…' : action.label}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}

// FSDP-53: switch a dish to "sold out" so customers can't order it
function MenuTab() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setError('');
    api.hawkerMenu().then(setItems).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function toggle(item) {
    setBusyId(item.id);
    setError('');
    try {
      const res = await api.setItemSoldOut(item.id, item.isAvailable);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isAvailable: res.isAvailable } : i)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (error && !items) return <ErrorState message={error} onRetry={load} />;
  if (!items) return <LoadingCards count={4} />;

  const soldOut = items.filter((i) => !i.isAvailable).length;
  return (
    <>
      <p className="muted menu-help">{soldOut ? `${soldOut} sold out. ` : ''}Turn a dish off when it runs out. Customers see “Sold out” straight away.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="list">
        {items.map((item) => (
          <div key={item.id} className={`card menu-row ${item.isAvailable ? '' : 'sold-out-row'}`}>
            <div className="grow">
              <h3>{item.name}</h3>
              <p className="muted small">{item.category} · {formatMoney(item.priceCents)} · {item.isAvailable ? 'Available' : 'Sold out'}</p>
            </div>
            <button type="button" role="switch" className="switch" aria-checked={item.isAvailable}
              aria-label={`${item.name} available`} disabled={busyId === item.id} onClick={() => toggle(item)} />
          </div>
        ))}
      </div>
    </>
  );
}