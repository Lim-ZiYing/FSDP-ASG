// Owner: Declan – FSDP-16 NETS QR payment, FSDP-17 payment status, FSDP-44 retry a failed payment
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, isMocked } from '../api.js';
import { mockTools } from '../mocks.js';
import { useCart } from '../cart.jsx';
import { usePolling } from '../usePolling.js';
import { formatMoney } from '../format.js';
import PageHeader from '../components/PageHeader.jsx';
import FakeQr from '../components/FakeQr.jsx';
import Icon from '../components/Icon.jsx';
import { ErrorState } from '../components/States.jsx';
import './Order.css';

const CHECK_MS = 3000;

export default function Payment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const [qr, setQr] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | pending | failed | timeout | success | error
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);

  const startPayment = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const data = await api.createNetsQr(orderId);
      setQr(data);
      setStatus('pending');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, [orderId]);

  useEffect(() => { startPayment(); }, [startPayment]);

  // Ask the server every few seconds whether the payment went through
  const check = useCallback(async () => {
    try {
      const res = await api.paymentStatus(orderId);
      if (res.status === 'success') {
        cart.clear();
        navigate(`/orders/${orderId}/confirmed`, { replace: true });
      } else if (res.status !== 'pending') {
        setStatus(res.status);
      }
    } catch { /* keep trying */ }
  }, [orderId, navigate, cart]);

  usePolling(check, CHECK_MS, status === 'pending');

  // Countdown until the QR code expires
  useEffect(() => {
    if (status !== 'pending' || !qr?.expiresAt) return undefined;
    const tick = () => {
      const left = Math.max(0, Math.round((new Date(qr.expiresAt) - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setStatus('timeout');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, qr]);

  async function cancel() {
    if (!window.confirm('Cancel this order? Your cart will be kept.')) return;
    try { await api.cancelOrder(orderId); } catch { /* already gone */ }
    navigate('/cart', { replace: true });
  }

  const demo = isMocked('paymentStatus');
  const mm = String(Math.floor(secondsLeft / 60));
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <>
      <PageHeader title="Pay with NETS" back="/cart" />

      {status === 'error' && <ErrorState message={error} onRetry={startPayment} />}

      {(status === 'loading' || status === 'pending') && (
        <div className="pay-card">
          <p className="muted">Amount to pay</p>
          <p className="pay-amount">{qr ? formatMoney(qr.amountCents) : '…'}</p>
          <div className="qr-box">
            {qr ? (qr.qrImage ? <img src={qr.qrImage} alt="NETS payment QR code" width="200" height="200" /> : <FakeQr text={qr.qrData} />) : <div className="qr-loading skeleton" />}
          </div>
          <p className="pay-steps">Open your banking app, choose <strong>NETS QR</strong> and scan this code.</p>
          <p className="pay-waiting" aria-live="polite">
            <span className="live-dot" aria-hidden="true" /> Waiting for payment{status === 'pending' && secondsLeft > 0 && <> · expires in {mm}:{ss}</>}
          </p>
          {qr?.ref && <p className="muted small">Ref {qr.ref}</p>}
        </div>
      )}

      {(status === 'failed' || status === 'timeout') && (
        <div className="pay-card" role="alert">
          <span className="empty-icon pay-fail"><Icon name={status === 'timeout' ? 'clock' : 'x'} size={28} /></span>
          <h2>{status === 'timeout' ? 'QR code expired' : 'Payment didn’t go through'}</h2>
          <p className="muted">{status === 'timeout' ? 'No payment was made. Get a new code to try again.' : 'You haven’t been charged. Check your bank app, then try again.'}</p>
          <button type="button" className="btn-primary" onClick={startPayment}><Icon name="refresh" /> Try again</button>
        </div>
      )}

      {status !== 'success' && (
        <button type="button" className="btn-outline cancel-btn" onClick={cancel}>Cancel order</button>
      )}

      {demo && status === 'pending' && (
        <div className="demo-box">
          <p className="small"><strong>Demo mode:</strong> payment goes through by itself in about 10 seconds, or test it now:</p>
          <div className="row">
            <button type="button" className="btn-dark btn-sm grow" onClick={() => { mockTools.forcePayment(orderId, 'success'); check(); }}>Pay now</button>
            <button type="button" className="btn-outline btn-sm grow" onClick={() => { mockTools.forcePayment(orderId, 'failed'); check(); }}>Make it fail</button>
          </div>
        </div>
      )}
    </>
  );
}