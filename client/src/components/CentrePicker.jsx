// Owner: Siyu – FSDP-68 the "Pick-up at …" button and the sheet to change hawker centre.
import { useState } from 'react';
import { useCentre } from '../centre.jsx';
import { useCart } from '../cart.jsx';
import Icon from './Icon.jsx';
import Sheet from './Sheet.jsx';

export default function CentrePicker() {
  const { centres, centre, centreId, setCentreId } = useCentre();
  const { count, clear } = useCart();
  const [open, setOpen] = useState(false);

  function choose(id) {
    if (id !== centreId && count > 0) {
      // A cart can only hold food from one centre
      if (!window.confirm('Your cart has food from another hawker centre. Empty the cart and switch?')) return;
      clear();
    }
    setCentreId(id);
    setOpen(false);
  }

  return (
    <>
      <button type="button" className="centre-btn" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Icon name="pin" size={16} />
        <span>Pick-up at <strong>{centre?.name || 'choose a centre'}</strong></span>
        <Icon name="chevronDown" size={16} />
      </button>
      {open && (
        <Sheet title="Choose hawker centre" onClose={() => setOpen(false)}>
          <div className="list" role="radiogroup" aria-label="Hawker centre">
            {centres.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={c.id === centreId} className="option" onClick={() => choose(c.id)}>
                <span className="radio" aria-hidden="true" />
                <span className="grow"><strong>{c.name}</strong><br /><span className="muted">{c.address}</span></span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}