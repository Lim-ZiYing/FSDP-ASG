import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';

export default function StallMenu() {
  const { id } = useParams();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getMenu(id).then(setItems).catch((e) => setError(e.message));
  }, [id]);

  return (
    <>
      <Link to="/" className="back">← Stalls</Link>
      <h1>Menu</h1>
      {error && <p className="error">{error}</p>}
      <div className="list">
        {items.map((item) => (
          <div key={item.id} className={`card row ${item.isSoldOut ? 'sold-out' : ''}`}>
            {item.photoUrl
              ? <img className="thumb" src={item.photoUrl} alt={item.name} />
              : <div className="thumb placeholder" aria-hidden="true" />}
            <div className="grow">
              <h3>{item.name}</h3>
              <p className="muted">↑ {item.topPhotoVotes} votes on top photo</p>
              <p className="price">${item.price.toFixed(2)}</p>
            </div>
            {item.isSoldOut
              ? <span className="pill">Sold out</span>
              : <button className="add" aria-label={`Add ${item.name}`}>+</button>}
            {/* TODO: add to cart (Ordering & cart epic) */}
          </div>
        ))}
      </div>
    </>
  );
}
