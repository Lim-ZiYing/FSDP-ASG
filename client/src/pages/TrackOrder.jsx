// Owner: Zi Ying – FSDP-48 live tracking, FSDP-32 estimated ready time,
//                  FSDP-66 one ready time across stalls, FSDP-49 "ready" notification
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { usePolling } from '../usePolling.js';
import { formatMoney, formatTime, minutesFromNow } from '../format.js';
import OrderStatus from '../components/OrderStatus.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Icon from '../components/Icon.jsx';
import { ErrorState, LoadingCards } from '../components/States.jsx';
import './LiveOrders.css';

const REFRESH_MS = 5000;
const FINISHED = ['collected', 'cancelled'];
const STALL_STATUS = {
  paid: 'Order received',
  preparing: 'Preparing',
  ready: 'Ready',
  collected: 'Collected',
};

export default function TrackOrder() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [notify, setNotify] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'));
  const lastStatus = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api.trackOrder(orderId);
      // FSDP-49: tell the customer the moment it turns ready (even if this tab is in the background)
      if (lastStatus.current && lastStatus.current !== 'ready' && data.status === 'ready') announceReady(data);
      lastStatus.current = data.status;
      setOrder(data);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [orderId]);

  usePolling(load, REFRESH_MS, !order || !FINISHED.includes(order.status));

  // Tick once a minute so "about 6 min" counts down between refreshes
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  async function askToNotify() {
    if (typeof Notification === 'undefined') return;
    setNotify(await Notification.requestPermission());
  }

  if (!order) {
    return (
      <>
        <PageHeader title="Your order" back="/orders" />
        {error ? <ErrorState message={`Couldn’t load your order: ${error}`} onRetry={load} /> : <LoadingCards count={2} />}
      </>
    );
  }

  const point = order.collectionPoint;
  const multi = order.stalls.length > 1;
  // FSDP-66: every stall aims for the same time, so the order is ready at the latest stall's time
  const readyAt = order.stalls.map((s) => s.estimatedReadyAt).filter(Boolean).sort().pop();
  const minsLeft = minutesFromNow(readyAt);
  const cooking = ['paid', 'preparing'].includes(order.status);

  return (
    <>
      <PageHeader title={`Order ${order.orderNo}`} back="/orders" />

      {order.status === 'ready' ? (
        <div className="ready-banner" role="status">
          <span className="ready-icon"><Icon name="bell" size={26} /></span>
          <div>
            <strong>Your food is ready!</strong>
            <span>Collect at {point?.name}{point?.note ? ` · ${point.note}` : ''}</span>
          </div>
        </div>
      ) : (
        <div className="eta-card">
          <p className="eyebrow">{headline(order.status)}</p>
          {cooking && readyAt ? (
            <>
              <p className="eta-big">{minsLeft <= 1 ? 'Any minute now' : <>About <strong>{minsLeft}</strong> min</>}</p>
              <p className="muted">Ready at around {formatTime(readyAt)}{!order.asap && ` · you chose ${formatTime(order.pickupTime)}`}</p>
            </>
          ) : (
            <p className="eta-big">{order.status === 'collected' ? 'Enjoy your meal!' : order.status === 'cancelled' ? 'Order cancelled' : 'Waiting for payment'}</p>
          )}
          {error && <p className="error small">Connection problem, retrying…</p>}
        </div>
      )}

      {order.status !== 'cancelled' && order.status !== 'pending_payment' && <OrderStatus status={order.status} />}

      {cooking && notify === 'default' && (
        <button type="button" className="notice notice-amber notify-btn" onClick={askToNotify}>
          <Icon name="bell" /> <span className="grow">Get a notification when it’s ready</span> <Icon name="chevronRight" />
        </button>
      )}
      {cooking && notify === 'granted' && (
        <p className="notice notice-green"><Icon name="bell" /> We’ll notify you when it’s ready.</p>
      )}

      <div className="card pickup-card">
        <Icon name="pin" />
        <div className="grow">
          <strong>{point?.name}</strong>
          <p className="muted">{point?.note}</p>
        </div>
      </div>

      <h2>{multi ? `${order.stalls.length} stalls, one pick-up` : 'Your order'}</h2>
      {multi && cooking && (
        <p className="muted small sync-note">Each stall times your food to be ready together, so you only make one trip.</p>
      )}
      <div className="list">
        {order.stalls.map((stall) => (
          <div key={stall.id} className="card stall-progress">
            <div className="between">
              <h3>{stall.name}</h3>
              <span className={`pill status-${stall.status}`}>
                {stall.status === 'ready' && <Icon name="check" size={13} strokeWidth={3} />} {STALL_STATUS[stall.status] || stall.status}
              </span>
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

      <div className="between track-foot">
        <span className="summary-total">Total {formatMoney(order.totalCents)}</span>
        <Link to={`/orders/${order.id}/receipt`} className="link-btn">View receipt</Link>
      </div>
    </>
  );
}

function headline(status) {
  switch (status) {
    case 'pending_payment': return 'Almost there';
    case 'paid': return 'Order received';
    case 'preparing': return 'Being prepared';
    case 'collected': return 'Collected';
    case 'cancelled': return 'Cancelled';
    default: return 'Your order';
  }
}

function announceReady(order) {
  const where = order.collectionPoint?.name || 'the collection point';
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Your food is ready!', { body: `Order ${order.orderNo} · collect at ${where}`, tag: `order-${order.id}` });
    }
    navigator.vibrate?.([200, 100, 200]);
  } catch { /* some phones only allow notifications from an installed app */ }
}