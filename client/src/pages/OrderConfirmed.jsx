// Owner: Declan – FSDP-43 order confirmation after payment
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { formatMoney, formatTime } from '../format.js';
import Icon from '../components/Icon.jsx';
import PickupQr from '../components/PickupQr.jsx';
import { ErrorState, LoadingCards } from '../components/States.jsx';
import './Order.css';

export default function OrderConfirmed() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getOrder(orderId).then(setOrder).catch((e) => setError(e.message));
  }, [orderId]);

  if (error) return <ErrorState message={error} />;
  if (!order) return <LoadingCards count={2} />;

  const readyAt = order.stalls.map((s) => s.estimatedReadyAt).filter(Boolean).sort().pop();

  return (
    <div className="confirmed">
      <span className="confirmed-tick"><Icon name="check" size={40} strokeWidth={3} /></span>
      <h1>Order placed!</h1>
      <p className="muted">Paid {formatMoney(order.totalCents)} · {order.orderNo}</p>

      <div className="card confirmed-card">
        <div className="between">
          <span className="muted">{order.asap ? 'Ready at about' : 'Pick up at'}</span>
          <strong className="confirmed-time">{formatTime(order.asap ? readyAt : order.pickupTime)}</strong>
        </div>
        <div className="divider" />
        <div className="row">
          <Icon name="pin" />
          <div className="grow"><strong>{order.collectionPoint?.name}</strong><br /><span className="muted">{order.collectionPoint?.note}</span></div>
        </div>
        <div className="divider" />
        <p className="small muted">{order.stalls.map((s) => s.name).join(' + ')}</p>
      </div>

      <PickupQr orderNo={order.orderNo} pointName={order.collectionPoint?.name} />

      <Link to={`/orders/${order.id}/track`} className="btn-primary">Track my order</Link>
      <Link to="/" className="btn-outline">Back to home</Link>
    </div>
  );
}