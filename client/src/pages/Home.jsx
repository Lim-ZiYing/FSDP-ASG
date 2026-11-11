// Owner: Siyu – FSDP-11 stall list, FSDP-40 sort by shortest wait, FSDP-41 search,
//                FSDP-68 choose hawker centre, FSDP-69 CDC filter, top-voted dishes (FSDP-22)
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useCentre } from '../centre.jsx';
import { formatMoney } from '../format.js';
import StallCard from '../components/StallCard.jsx';
import CentrePicker from '../components/CentrePicker.jsx';
import AccountMenu from '../components/AccountMenu.jsx';
import FoodImage from '../components/FoodImage.jsx';
import Icon from '../components/Icon.jsx';
import { EmptyState, ErrorState, LoadingCards } from '../components/States.jsx';
import './Browse.css';

const SORTS = [
  { key: 'wait', label: 'Shortest wait' },
  { key: 'name', label: 'A–Z' },
];

export default function Home() {
  const { user } = useAuth();
  const { centreId } = useCentre();
  const [stalls, setStalls] = useState([]);
  const [topDishes, setTopDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('wait');
  const [cdcOnly, setCdcOnly] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null); // search results, or null when not searching

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([api.getStalls({ centreId }), api.getTopDishes(centreId).catch(() => [])])
      .then(([s, top]) => { setStalls(s); setTopDishes(top); })
      .catch(() => setError('Couldn’t load stalls. Check your connection and try again.'))
      .finally(() => setLoading(false));
  }, [centreId]);

  useEffect(load, [load]);

  // Search as you type (waits 300 ms after the last key so we don't call the server on every letter)
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults(null); return undefined; }
    let ignore = false;
    const t = setTimeout(() => {
      api.search(term, centreId).then((r) => !ignore && setResults(r)).catch(() => !ignore && setResults({ stalls: [], dishes: [] }));
    }, 300);
    return () => { ignore = true; clearTimeout(t); };
  }, [q, centreId]);

  const shown = stalls
    .filter((s) => !cdcOnly || s.acceptsCdc)
    .sort((a, b) => {
      if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1; // closed stalls go last
      return sort === 'wait' ? a.estimatedMinutes - b.estimatedMinutes : a.name.localeCompare(b.name);
    });

  const firstName = user?.displayName?.split(' ')[0];

  return (
    <>
      <div className="between home-top">
        <CentrePicker />
        <AccountMenu />
      </div>
      <h1 className="home-title">{firstName ? `Hungry, ${firstName}?` : 'What’s for lunch?'}</h1>

      <label className="search">
        <Icon name="search" />
        <span className="sr-only">Search stalls or dishes</span>
        <input type="text" inputMode="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stalls or dishes" />
        {q && <button type="button" className="icon-btn icon-btn-plain" onClick={() => setQ('')} aria-label="Clear search"><Icon name="x" size={18} /></button>}
      </label>

      {results ? (
        <SearchResults q={q.trim()} results={results} />
      ) : (
        <>
          <div className="rush-banner">
            <span className="rush-icon"><Icon name="zap" size={22} /></span>
            <div className="grow">
              <strong>In a rush?</strong>
              <span>Order now, collect when it’s ready. No queueing.</span>
            </div>
          </div>

          {topDishes.length > 0 && (
            <>
              <div className="section-head"><h2>Top voted today</h2><span className="muted small">by diners</span></div>
              <div className="scroller" role="list">
                {topDishes.map((d) => (
                  <Link key={d.itemId} to={`/dishes/${d.itemId}`} className="dish-tile" role="listitem">
                    <FoodImage src={d.photoUrl} className="dish-tile-img" />
                    <span className="vote-chip"><Icon name="up" size={12} strokeWidth={2.6} /> {d.votes}</span>
                    <strong>{d.name}</strong>
                    <span className="muted small">{d.stallName}</span>
                    <span className="price">{formatMoney(d.priceCents)}</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          <div className="section-head"><h2>Stalls</h2><span className="muted small">{shown.length} {shown.length === 1 ? 'stall' : 'stalls'}</span></div>
          <div className="chips" role="group" aria-label="Sort and filter">
            {SORTS.map((s) => (
              <button key={s.key} type="button" className="chip" aria-pressed={sort === s.key} onClick={() => setSort(s.key)}>
                {s.key === 'wait' && <Icon name="clock" size={14} />} {s.label}
              </button>
            ))}
            <button type="button" className="chip" aria-pressed={cdcOnly} onClick={() => setCdcOnly((v) => !v)}>
              Accepts CDC
            </button>
          </div>

          <div className="list stall-list">
            {loading && <LoadingCards />}
            {!loading && error && <ErrorState message={error} onRetry={load} />}
            {!loading && !error && shown.length === 0 && (
              <EmptyState icon="store" title={cdcOnly ? 'No CDC stalls here' : 'No stalls yet'}
                text={cdcOnly ? 'Turn off the CDC filter to see every stall.' : 'Try another hawker centre.'} />
            )}
            {!loading && !error && shown.map((s) => <StallCard key={s.id} stall={s} />)}
          </div>
        </>
      )}
    </>
  );
}

function SearchResults({ q, results }) {
  const { stalls, dishes } = results;
  if (!stalls.length && !dishes.length) {
    return <EmptyState icon="search" title={`No results for “${q}”`} text="Try a stall name or a dish like “laksa”." />;
  }
  return (
    <div aria-live="polite">
      {dishes.length > 0 && (
        <>
          <h2>Dishes</h2>
          <div className="list">
            {dishes.map((d) => (
              <Link key={d.itemId} to={`/dishes/${d.itemId}`} className="card row">
                <FoodImage src={d.photoUrl} />
                <div className="grow"><h3>{d.name}</h3><p className="muted">{d.stallName}</p></div>
                <span className="price">{formatMoney(d.priceCents)}</span>
              </Link>
            ))}
          </div>
        </>
      )}
      {stalls.length > 0 && (
        <>
          <h2>Stalls</h2>
          <div className="list">{stalls.map((s) => <StallCard key={s.id} stall={s} />)}</div>
        </>
      )}
    </div>
  );
}