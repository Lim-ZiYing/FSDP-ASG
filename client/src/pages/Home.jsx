// Owner: Siyu – FSDP-11 view list of stalls
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import StallCard from '../components/StallCard.jsx';
import SkeletonList from '../components/SkeletonList.jsx';
import './Browse.css';

export default function Home() {
  const [stalls, setStalls] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api.getStalls()
      .then(setStalls)
      .catch(() => setError('Couldn’t load stalls. Check your connection and try again.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  return (
    <>
      <p className="eyebrow">Pick-up at Maxwell Food Centre</p>
      <h1>What’s for lunch?</h1>

      <div className="banner">
        <strong>Lunch rush right now</strong>
        <span>Order ahead and skip the queue</span>
      </div>

      <h2>Stalls · shortest queue first</h2>
      {loading && <SkeletonList />}
      {error && (
        <div role="alert" className="empty">
          <p className="error">{error}</p>
          <button type="button" className="retry" onClick={load}>Try again</button>
        </div>
      )}
      {!loading && !error && stalls.length === 0 && <p className="muted empty">No stalls to show yet.</p>}
      <div className="list">
        {stalls.map((s) => <StallCard key={s.id} stall={s} />)}
      </div>
    </>
  );
}