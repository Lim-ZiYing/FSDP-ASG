// Owner: Lennox – FSDP-45 receipt details for a past order
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { formatDate, formatMoney, formatTime } from '../format.js';
import PageHeader from '../components/PageHeader.jsx';
import Icon from '../components/Icon.jsx';
import { ErrorState, LoadingCards } from '../components/States.jsx';
import './Order.css';

export default function Receipt() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getOrder(orderId).then(setOrder).catch((e) => setError(e.message));
  }, [orderId]);

  return (
    <>
      <PageHeader title="Receipt" back="/orders" />
      {error && <ErrorState message={error} />}
      {!order && !error && <LoadingCards count={2} />}
      {order && (
        <article className="receipt" aria-label={`Receipt for order ${order.orderNo}`}>
          <div className="receipt-top">
            <span className="empty-icon"><Icon name="receipt" size={24} /></span>
            <h2>{order.centreName}</h2>
            <p className="muted">{formatDate(order.createdAt)}, {formatTime(order.createdAt)} · {order.orderNo}</p>
          </div>

          {order.stalls.map((s) => (
            <section key={s.id} className="receipt-stall">
              <div className="between"><strong>{s.name}</strong><span className="muted small">{s.unitNo}</span></div>
              {s.items.map((i, n) => (
                <div key={n} className="receipt-line">
                  <div className="summary-row"><span>{i.quantity} × {i.name}</span><span>{formatMoney(i.unitPriceCents * i.quantity)}</span></div>
                  {i.notes && <p className="muted small">“{i.notes}”</p>}
                </div>
              ))}
              <div className="summary-row muted"><span>Subtotal</span><span>{formatMoney(s.subtotalCents)}</span></div>
            </section>
          ))}

          <div className="summary-row summary-total receipt-total"><span>Total paid</span><span>{formatMoney(order.totalCents)}</span></div>

          <dl className="receipt-meta">
            <div><dt>Payment</dt><dd>{order.payment ? `${order.payment.method} · ${order.payment.status === 'success' ? 'Paid' : order.payment.status}` : 'Not paid'}</dd></div>
            {order.payment?.ref && <div><dt>Reference</dt><dd>{order.payment.ref}</dd></div>}
            {order.payment?.paidAt && <div><dt>Paid at</dt><dd>{formatTime(order.payment.paidAt)}</dd></div>}
            <div><dt>Pick-up</dt><dd>{order.asap ? 'As soon as possible' : formatTime(order.pickupTime)}</dd></div>
            <div><dt>Collection point</dt><dd>{order.collectionPoint?.name}</dd></div>
            {order.collectedAt && <div><dt>Collected</dt><dd>{formatTime(order.collectedAt)}</dd></div>}
          </dl>
        </article>
      )}
    </>
  );
}