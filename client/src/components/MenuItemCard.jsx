// Owner: Siyu – FSDP-12 one dish on a stall's eMenu: photo, name, price, votes
// onAdd: pass a function and the + button appears. inCart: how many are already in the cart.
import { Link } from 'react-router-dom';
import FoodImage from './FoodImage.jsx';
import Icon from './Icon.jsx';
import { formatMoney } from '../format.js';

export const formatPrice = formatMoney; // kept so older imports still work

export default function MenuItemCard({ item, onAdd, inCart = 0 }) {
  return (
    <div className={`card row ${item.isAvailable ? '' : 'sold-out'}`}>
      <Link to={`/dishes/${item.id}`} className="row grow" aria-label={`${item.name}, ${formatMoney(item.priceCents)}${item.isAvailable ? '' : ', sold out'}`}>
        <FoodImage src={item.photoUrl} alt="" />
        <div className="grow">
          <h3>{item.name}</h3>
          {item.description && <p className="muted menu-desc">{item.description}</p>}
          <div className="between menu-meta">
            <span className="price">{formatMoney(item.priceCents)}</span>
            {item.topPhotoVotes > 0 && (
              <span className="muted small row-tight"><Icon name="up" size={13} strokeWidth={2.4} /> {item.topPhotoVotes}</span>
            )}
          </div>
        </div>
      </Link>
      {!item.isAvailable ? (
        <span className="pill">Sold out</span>
      ) : onAdd && (
        <button type="button" className="add" aria-label={`Add ${item.name}${inCart ? ` (${inCart} in cart)` : ''}`} onClick={() => onAdd(item)}>
          {inCart > 0 ? <span className="add-count">{inCart}</span> : <Icon name="plus" size={20} strokeWidth={2.6} />}
        </button>
      )}
    </div>
  );
}