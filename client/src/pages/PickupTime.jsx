// Owner: Lennox – FSDP-29 order for later today, FSDP-33 pick-up time chips, FSDP-30/31 collection point
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useCart } from '../cart.jsx';
import { useCentre } from '../centre.jsx';
import { formatMoney, formatTime } from '../format.js';
import PageHeader from '../components/PageHeader.jsx';
import Icon from '../components/Icon.jsx';
import { ErrorState, LoadingCards } from '../components/States.jsx';
import './Order.css';

export default function PickupTime() {
  const cart = useCart();
  const { centreId, centre } = useCentre();
  const navigate = useNavigate();
  const [slots, setSlots] = useState(null);
  const [points, setPoints] = useState([]);
  const [asap, setAsap] = useState(true);
  const [time, setTime] = useState('');
  const [pointId, setPointId] = useState(null);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);

  const stallIds = cart.byStall.map((g) => g.stallId);
  const stallKey = stallIds.join(',');

  function load() {
    setError('');
    Promise.all([api.getPickupSlots(centreId, stallIds), api.getCollectionPoints(centreId)])
      .then(([s, p]) => { setSlots(s); setPoints(p); setPointId((cur) => cur ?? p[0]?.id ?? null); })
      .catch(() => setError('Couldn’t load pick-up times. Try again.'));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [centreId, stallKey]);

  if (cart.count === 0) return <Navigate to="/cart" replace />;

  async function placeOrder() {
    setSubmitError('');
    if (!asap && !time) return setSubmitError('Choose a pick-up time');
    if (!pointId) return setSubmitError('Choose a collection point');
    setBusy(true);
    try {
      const order = await api.placeOrder({
        centreId,
        collectionPointId: pointId,
        asap,
        pickupTime: asap ? null : time,
        items: cart.lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, notes: l.notes || null })),
      });
      navigate(`/pay/${order.id}`, { replace: true });
    } catch (err) {
      setSubmitError(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Pick-up" back="/cart" />
      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !slots && <LoadingCards count={3} />}

      {slots && (
        <>
          <h2 className="first-h2">When?</h2>
          <div className="list" role="radiogroup" aria-label="Pick-up time">
            <button type="button" role="radio" aria-checked={asap} className="option" onClick={() => setAsap(true)}>
              <span className="radio" aria-hidden="true" />
              <span className="grow"><strong>As soon as possible</strong><br /><span className="muted">Ready in about {slots.asapMinutes} min</span></span>
              <Icon name="zap" className="opt-icon" />
            </button>
            <button type="button" role="radio" aria-checked={!asap} className="option" onClick={() => setAsap(false)}>
              <span className="radio" aria-hidden="true" />
              <span className="grow"><strong>Later today</strong><br /><span className="muted">Pick a time. Hawkers start cooking just before.</span></span>
              <Icon name="clock" className="opt-icon" />
            </button>
          </div>

          {!asap && (
            <>
              <h3 className="slot-head">Choose a time</h3>
              <div className="slot-grid" role="radiogroup" aria-label="Time slots">
                {slots.slots.map((s) => (
                  <button key={s.time} type="button" role="radio" className="slot" aria-checked={time === s.time}
                    disabled={!s.available} onClick={() => setTime(s.time)}>
                    {formatTime(s.time)}
                    {!s.available && <span className="slot-full">Full</span>}
                  </button>
                ))}
              </div>
              <p className="muted small">Full slots have too many orders already.</p>
            </>
          )}

          <h2>Where?</h2>
          <p className="muted small where-sub">{centre?.name}</p>
          <div className="list" role="radiogroup" aria-label="Collection point">
            {points.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={pointId === p.id} className="option" onClick={() => setPointId(p.id)}>
                <span className="radio" aria-hidden="true" />
                <span className="grow"><strong>{p.name}</strong><br /><span className="muted">{p.note}</span></span>
                <Icon name="pin" className="opt-icon" />
              </button>
            ))}
          </div>

          {submitError && <p className="notice notice-red submit-error" role="alert"><Icon name="alert" /> {submitError}</p>}

          <div className="sticky-bar">
            <div className="grow">
              <span className="muted small">Total</span>
              <div className="summary-total">{formatMoney(cart.totalCents)}</div>
            </div>
            <button type="button" className="btn-primary pay-btn" onClick={placeOrder} disabled={busy}>
              {busy ? 'Placing order…' : <>Go to payment <Icon name="chevronRight" /></>}
            </button>
          </div>
        </>
      )}
    </>
  );
}