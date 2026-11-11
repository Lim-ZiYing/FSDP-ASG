// Owner: Siyu – FSDP-12 one dish on a stall's eMenu: photo, name, price
// onAdd is the hook for the cart (Lennox): pass a function and the + button appears.
import { Link } from 'react-router-dom';
import FoodImage from './FoodImage.jsx';

export function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function MenuItemCard({ item, onAdd }) {
  return (
    <div className={`card row ${item.isAvailable ? '' : 'sold-out'}`}>
      <Link to={`/dishes/${item.id}`} className="row grow" aria-label={`${item.name}, ${formatPrice(item.priceCents)}`}>
        <FoodImage src={item.photoUrl} alt={item.name} />
        <div className="grow">
          <h3>{item.name}</h3>
          {item.description && <p className="muted menu-desc">{item.description}</p>}
          <p className="price">{formatPrice(item.priceCents)}</p>
          {item.topPhotoVotes > 0 && <p className="muted">↑ {item.topPhotoVotes} {item.topPhotoVotes === 1 ? 'vote' : 'votes'} on this photo</p>}
        </div>
      </Link>
      {!item.isAvailable
        ? <span className="pill">Sold out</span>
        : onAdd && <button type="button" className="add" aria-label={`Add ${item.name}`} onClick={() => onAdd(item)}>+</button>}
    </div>
  );
}