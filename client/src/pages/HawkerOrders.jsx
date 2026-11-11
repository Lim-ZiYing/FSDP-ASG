// Owner: Zi Ying – FSDP-50 (incoming orders), FSDP-51 (update status)
import { useCallback, useRef, useState } from 'react';
import { api } from '../api.js';
import { usePolling } from '../usePolling.js';
import { formatTime } from '../format.js';
import './LiveOrders.css';

const REFRESH_MS = 5000;

const TABS = [
  { key: 'paid', label: 'New' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
];

const ACTION_LABEL = {
  preparing: 'Start preparing',
  ready: 'Mark ready',
  collected: 'Mark collected',
};

export default function HawkerOrders() {
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

  if (loading) return <p className="muted">Loading orders…</p>;
  if (error && orders.length === 0) return <p className="error" role="alert">Couldn’t load orders: {error}</p>;
  if (stalls.length === 0) {
    return (
      <>
        <h1>Incoming orders</h1>
        <p className="muted">Your account isn’t linked to a stall yet. Ask the team to set your stall’s owner to you.</p>
      </>
    );
  }

  const counts = Object.fromEntries(TABS.map((t) => [t.key, orders.filter((o) => o.status === t.key).length]));
  const shown = orders.filter((o) => o.status === tab);

  return (
    <>
      <p className="eyebrow">{stalls.map((s) => `${s.name}${s.unitNo ? ` · ${s.unitNo}` : ''}`).join(', ')}</p>
      <h1>Incoming orders</h1>
      <p className="live-note" aria-live="polite">
        <span className="live-dot" aria-hidden="true" /> Live
        {updatedAt && <> · updated {updatedAt.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</>}
        {error && <span className="error"> · connection problem, retrying</span>}
      </p>

      <div className="tabs" role="tablist" aria-label="Order status">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
            className={`tab ${tab === t.key ? 'tab-active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label} <span className="tab-count">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {actionError && <p className="error" role="alert">{actionError}</p>}

      {shown.length === 0 ? (
        <p className="muted empty">
          {tab === 'paid' ? 'No new orders right now. Paid orders appear here automatically.' : 'Nothing here right now.'}
        </p>
      ) : (
        <div className="list">
          {shown.map((card) => (
            <article key={card.id} className="card order-card">
              <div className="order-head">
                <h3>{card.order.orderNo}</h3>
                {newIds.has(card.id) && <span className="pill pill-new">New</span>}
                <span className="pickup">
                  {card.order.asap ? `ASAP · ordered ${formatTime(card.order.createdAt)}` : `Pick up ${formatTime(card.order.pickupTime)}`}
                </span>
              </div>
              <p className="muted">
                {card.order.customerName}
                {card.order.collectionPoint && ` · ${card.order.collectionPoint}`}
              </p>
              <ul className="order-items">
                {card.items.map((item) => (
                  <li key={item.id}>
                    <strong>{item.quantity} ×</strong> {item.name}
                    {item.notes && <span className="item-note"> – {item.notes}</span>}
                  </li>
                ))}
              </ul>
              {card.nextStatus && (
                <button type="button" className="btn-primary" disabled={busyId === card.id} onClick={() => advance(card)}>
                  {busyId === card.id ? 'Updating…' : ACTION_LABEL[card.nextStatus]}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}