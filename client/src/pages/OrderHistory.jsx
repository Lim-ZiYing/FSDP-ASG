// Owner: Lennox – FSDP-18 order history and reorder · FSDP-45 receipts
import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useCart } from '../cart.jsx';
import { usePolling } from '../usePolling.js';
import { formatDate, formatMoney, formatTime } from '../format.js';
import Icon from '../components/Icon.jsx';
import { EmptyState, ErrorState, LoadingCards } from '../components/States.jsx';
import './Order.css';
import './LiveOrders.css';

const ACTIVE = ['pending_payment', 'paid', 'preparing', 'ready'];
const STATUS = {
  pending_payment: { label: 'Not paid', className: 'q-busy' },
  paid: { label: 'Received', className: 'status-paid' },
  preparing: { label: 'Preparing', className: 'status-preparing' },
  ready: { label: 'Ready', className: 'status-ready' },
  collected: { label: 'Collected', className: 'status-collected' },
};

export default function OrderHistory() {
  const cart = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setOrders(await api.myOrders());
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Refresh while any order is still cooking
  usePolling(load, 10000, !orders || orders.some((o) => ACTIVE.includes(o.status)));

  function reorder(order) {
    for (const s of order.stalls) {
      for (const i of s.items) {
        cart.add({ id: i.itemId, name: i.name, priceCents: i.unitPriceCents, photoUrl: i.photoUrl }, { id: s.stallId, name: s.name }, i.quantity, i.notes || '');
      }
    }
    navigate('/cart');
  }

  if (error && !orders) return <><h1>Orders</h1><ErrorState message={error} onRetry={load} /></>;
  if (!orders) return <><h1>Orders</h1><LoadingCards count={3} /></>;

  const active = orders.filter((o) => ACTIVE.includes(o.status));
  const past = orders.filter((o) => !ACTIVE.includes(o.status));

  return (
    <>
      <h1>Orders</h1>
      {orders.length === 0 && (
        <EmptyState icon="orders" title="No orders yet" text="Your orders and receipts will show up here.">
          <Link to="/" className="btn-primary">Order something</Link>
        </EmptyState>
      )}

      {active.length > 0 && (
        <>
          <h2 className="first-h2">Happening now</h2>
          <div className="list">
            {active.map((o) => (
              <Link key={o.id} to={o.status === 'pending_payment' ? `/pay/${o.id}` : `/orders/${o.id}/track`} className={`card active-order ${o.status === 'ready' ? 'is-ready' : ''}`}>
                <div className="between">
                  <strong className="order-no">{o.orderNo}</strong>
                  <span className={`pill ${STATUS[o.status].className}`}>{STATUS[o.status].label}</span>
                </div>
                <p className="muted">{o.stalls.map((s) => s.name).join(' + ')}</p>
                <div className="between">
                  <span className="small"><Icon name="clock" size={14} /> {o.asap ? 'As soon as possible' : `Pick up ${formatTime(o.pickupTime)}`}</span>
                  <span className="link-btn row-tight">{o.status === 'pending_payment' ? 'Pay now' : 'Track'} <Icon name="chevronRight" size={16} /></span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <h2>Past orders</h2>
          <div className="list">
            {past.map((o) => (
              <div key={o.id} className="card past-order">
                <div className="between">
                  <div>
                    <strong>{o.stalls.map((s) => s.name).join(' + ')}</strong>
                    <p className="muted small">{formatDate(o.createdAt)} · {o.orderNo}</p>
                  </div>
                  <span className="price">{formatMoney(o.totalCents)}</span>
                </div>
                <p className="small past-items">{o.stalls.flatMap((s) => s.items).map((i) => `${i.quantity}× ${i.name}`).join(', ')}</p>
                <div className="row">
                  <Link to={`/orders/${o.id}/receipt`} className="btn-outline btn-sm grow"><Icon name="receipt" size={16} /> Receipt</Link>
                  <button type="button" className="btn-dark btn-sm grow" onClick={() => reorder(o)}><Icon name="repeat" size={16} /> Order again</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}