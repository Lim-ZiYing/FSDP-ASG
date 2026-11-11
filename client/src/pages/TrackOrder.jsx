// Owner: Zi Ying – FSDP-48 (track order status live)
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { usePolling } from '../usePolling.js';
import { formatMoney, formatTime } from '../format.js';
import OrderStatus from '../components/OrderStatus.jsx';
import './LiveOrders.css';

const REFRESH_MS = 5000;
const FINISHED = ['collected', 'cancelled'];

const STALL_STATUS_LABEL = {
  paid: 'Order received',
  preparing: 'Preparing',
  ready: 'Ready',
  collected: 'Collected',
};

export default function TrackOrder() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setOrder(await api.trackOrder(orderId));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [orderId]);

  // Stop refreshing once the order is finished
  usePolling(load, REFRESH_MS, !order || !FINISHED.includes(order.status));

  if (!order) {
    return error
      ? <p className="error" role="alert">Couldn’t load your order: {error}</p>
      : <p className="muted">Loading your order…</p>;
  }

  const pickup = order.collectionPoint?.name || 'the stall';
  const multiStall = order.stalls.length > 1;

  return (
    <>
      <Link to="/orders" className="back">← Orders</Link>
      <p className="eyebrow">Order {order.orderNo}</p>
      <h1>{headline(order.status)}</h1>

      {order.status === 'ready' && (
        <div className="ready-banner" role="status">
          <strong>Your food is ready</strong>
          <span>Collect at {pickup}{order.collectionPoint?.note ? ` (${order.collectionPoint.note})` : ''}</span>
        </div>
      )}

      {order.status === 'pending_payment' && (
        <p className="muted">Waiting for payment. Stalls start once it’s paid.</p>
      )}

      {order.status !== 'cancelled' && order.status !== 'pending_payment' && <OrderStatus status={order.status} />}

      <p className="muted">
        {order.asap ? 'As soon as possible' : `Pick up at ${formatTime(order.pickupTime)}`} · {pickup}
        {error && <span className="error"> · connection problem, retrying</span>}
      </p>

      <h2>{multiStall ? `Your ${order.stalls.length} stalls` : 'Your order'}</h2>
      <div className="list">
        {order.stalls.map((stall) => (
          <div key={stall.id} className="card">
            <div className="order-head">
              <h3>{stall.name}</h3>
              <span className={`pill status-${stall.status}`}>{STALL_STATUS_LABEL[stall.status] || stall.status}</span>
            </div>
            <ul className="order-items">
              {stall.items.map((item, i) => (
                <li key={i}>
                  <strong>{item.quantity} ×</strong> {item.name}
                  {item.notes && <span className="item-note"> – {item.notes}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {multiStall && order.status === 'preparing' && (
        <p className="muted">We’ll show “ready” once every stall has finished, so you only need one trip.</p>
      )}
      <p className="total">Total {formatMoney(order.totalCents)}</p>
    </>
  );
}

function headline(status) {
  switch (status) {
    case 'pending_payment': return 'Almost there';
    case 'paid': return 'Order received';
    case 'preparing': return 'Being prepared';
    case 'ready': return 'Ready to collect';
    case 'collected': return 'Enjoy your meal';
    case 'cancelled': return 'Order cancelled';
    default: return 'Your order';
  }
}