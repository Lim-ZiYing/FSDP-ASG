// Owner: Siyu – FSDP-11 one stall in the list: photo, name, live queue, CDC
import { Link } from 'react-router-dom';
import FoodImage from './FoodImage.jsx';
import QueuePill from './QueuePill.jsx';

export default function StallCard({ stall }) {
  return (
    <Link to={`/stalls/${stall.id}`} className={`card row stall-card ${stall.isOpen ? '' : 'sold-out'}`}>
      <FoodImage src={stall.photoUrl} alt="" />
      <div className="grow">
        <h3>{stall.name}</h3>
        <p className="muted">{stall.cuisine} · {stall.unitNo}</p>
        <div className="pills">
          <QueuePill minutes={stall.estimatedMinutes} isOpen={stall.isOpen} />
          {stall.acceptsCdc && <span className="pill cdc">CDC</span>}
        </div>
      </div>
    </Link>
  );
}