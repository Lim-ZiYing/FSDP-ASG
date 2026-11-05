import { Link } from 'react-router-dom';

function queueLevel(minutes) {
  if (minutes <= 7) return { label: 'Short', className: 'q-short' };
  if (minutes <= 15) return { label: 'Medium', className: 'q-medium' };
  return { label: 'Busy', className: 'q-busy' };
}

export default function StallCard({ stall }) {
  const q = queueLevel(stall.estimatedMinutes);
  return (
    <Link to={`/stalls/${stall.id}`} className="card row">
      {stall.photoUrl
        ? <img className="thumb" src={stall.photoUrl} alt="" />
        : <div className="thumb placeholder" aria-hidden="true" />}
      <div className="grow">
        <h3>{stall.name}</h3>
        <p className="muted">{stall.cuisine} · {stall.unitNo}</p>
        <div className="pills">
          <span className={`pill ${q.className}`}>{q.label} queue · ~{stall.estimatedMinutes} min</span>
          {stall.acceptsCdc && <span className="pill cdc">CDC</span>}
        </div>
      </div>
    </Link>
  );
}
