import { useEffect, useState } from 'react';
import { api } from '../api.js';
import StallCard from '../components/StallCard.jsx';

export default function Home() {
  const [stalls, setStalls] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStalls()
      .then(setStalls)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <p className="eyebrow">Pick-up at Maxwell Food Centre</p>
      <h1>What’s for lunch?</h1>

      <div className="banner">
        <strong>Lunch rush right now</strong>
        <span>Order ahead and skip the queue</span>
      </div>

      <h2>Stalls · shortest queue first</h2>
      {loading && <p className="muted">Loading stalls…</p>}
      {error && <p className="error">Couldn’t load stalls: {error}</p>}
      <div className="list">
        {stalls.map((s) => <StallCard key={s.id} stall={s} />)}
      </div>
    </>
  );
}
