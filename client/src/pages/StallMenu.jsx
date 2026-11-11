// Owner: Siyu – FSDP-12 view stall eMenu with photos and prices
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import MenuItemCard from '../components/MenuItemCard.jsx';
import SkeletonList from '../components/SkeletonList.jsx';
import './Browse.css';

export default function StallMenu() {
  const { id } = useParams();
  const [stall, setStall] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    setStall(null);
    Promise.all([api.getStall(id), api.getMenu(id)])
      .then(([s, m]) => { if (!ignore) { setStall(s); setItems(m); } })
      .catch((e) => {
        if (!ignore) setError(e.status === 404 ? 'We couldn’t find that stall.' : 'Couldn’t load the menu. Check your connection and try again.');
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [id]);

  useEffect(load, [load]);

  // Group dishes by category, keeping the order the server sent them in
  const groups = [];
  for (const item of items) {
    const name = item.category || 'Menu';
    let g = groups.find((x) => x.name === name);
    if (!g) groups.push((g = { name, items: [] }));
    g.items.push(item);
  }

  return (
    <>
      <Link to="/" className="back">← Stalls</Link>

      {stall && (
        <div className="menu-head">
          <h1>{stall.name}</h1>
          <p className="muted">{[stall.cuisine, stall.unitNo].filter(Boolean).join(' · ')}</p>
          <div className="pills">
            {stall.isOpen
              ? <span className="pill q-short">Open · ~{stall.estimatedMinutes} min wait</span>
              : <span className="pill">Closed right now</span>}
            {stall.acceptsCdc && <span className="pill cdc">CDC</span>}
          </div>
        </div>
      )}

      {loading && <SkeletonList count={5} />}
      {error && (
        <div role="alert" className="empty">
          <p className="error">{error}</p>
          <button type="button" className="retry" onClick={load}>Try again</button>
        </div>
      )}
      {!loading && !error && items.length === 0 && <p className="muted empty">This stall has no dishes yet.</p>}

      {groups.map((g) => (
        <section key={g.name}>
          {groups.length > 1 && <h2 className="menu-section">{g.name}</h2>}
          <div className="list">
            {/* onAdd: pass the cart's add function here when the cart epic is merged */}
            {g.items.map((item) => <MenuItemCard key={item.id} item={item} />)}
          </div>
        </section>
      ))}
    </>
  );
}
