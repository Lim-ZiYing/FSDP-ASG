// Owner: Lennox – FSDP-14/15 cart, FSDP-65 one cart across many stalls, FSDP-42 notes per dish
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../cart.jsx';
import { formatMoney } from '../format.js';
import PageHeader from '../components/PageHeader.jsx';
import FoodImage from '../components/FoodImage.jsx';
import Stepper from '../components/Stepper.jsx';
import Icon from '../components/Icon.jsx';
import { EmptyState } from '../components/States.jsx';
import './Order.css';

export default function Cart() {
  const cart = useCart();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null); // key of the line whose note is open

  if (cart.count === 0) {
    return (
      <>
        <PageHeader title="Your cart" back="/" />
        <EmptyState icon="cart" title="Your cart is empty" text="Add dishes from any stall. We’ll get them ready together.">
          <Link to="/" className="btn-primary">Browse stalls</Link>
        </EmptyState>
      </>
    );
  }

  const multi = cart.byStall.length > 1;

  return (
    <>
      <PageHeader title="Your cart" right={<button type="button" className="link-btn" onClick={() => window.confirm('Remove everything from your cart?') && cart.clear()}>Clear</button>} />

      {multi && (
        <p className="notice notice-green">
          <Icon name="check" /> {cart.byStall.length} stalls, one payment. We’ll tell you when everything is ready to collect together.
        </p>
      )}

      {cart.byStall.map((group) => (
        <section key={group.stallId} className="card cart-group">
          <div className="between">
            <Link to={`/stalls/${group.stallId}`} className="row-tight cart-stall"><Icon name="store" size={16} /> {group.stallName}</Link>
            <span className="muted small">{formatMoney(group.subtotalCents)}</span>
          </div>
          {group.lines.map((line) => (
            <div key={line.key} className="cart-line">
              <div className="row">
                <FoodImage src={line.photoUrl} className="thumb thumb-sm" />
                <div className="grow">
                  <h3>{line.name}</h3>
                  <span className="price">{formatMoney(line.priceCents * line.quantity)}</span>
                </div>
                <Stepper value={line.quantity} min={0} onChange={(q) => cart.setQuantity(line.key, q)} label={`Quantity of ${line.name}`} />
              </div>
              {editing === line.key ? (
                <div className="field cart-note-edit">
                  <label htmlFor={`note-${line.key}`} className="sr-only">Note for {line.name}</label>
                  <input id={`note-${line.key}`} autoFocus maxLength={80} value={line.notes} placeholder="e.g. less rice"
                    onChange={(e) => cart.setNotes(line.key, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditing(null)} />
                  <button type="button" className="link-btn" onClick={() => setEditing(null)}>Done</button>
                </div>
              ) : (
                <button type="button" className="cart-note" onClick={() => setEditing(line.key)}>
                  <Icon name="edit" size={14} /> {line.notes ? <span>“{line.notes}”</span> : <span className="muted">Add a note for the hawker</span>}
                </button>
              )}
            </div>
          ))}
          <Link to={`/stalls/${group.stallId}`} className="link-btn add-more"><Icon name="plus" size={16} /> Add more from this stall</Link>
        </section>
      ))}

      <Link to="/" className="option add-stall">
        <Icon name="store" /> <span className="grow">Add food from another stall</span> <Icon name="chevronRight" />
      </Link>

      <div className="card order-summary">
        {cart.byStall.map((g) => (
          <div key={g.stallId} className="summary-row"><span>{g.stallName}</span><span>{formatMoney(g.subtotalCents)}</span></div>
        ))}
        <div className="divider" />
        <div className="summary-row summary-total"><span>Total</span><span>{formatMoney(cart.totalCents)}</span></div>
      </div>

      <div className="sticky-bar">
        <button type="button" className="btn-primary" onClick={() => navigate('/pickup')}>
          Choose pick-up time <Icon name="chevronRight" />
        </button>
      </div>
    </>
  );
}
