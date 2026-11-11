// Owner: Siyu – FSDP-22 vote on photos · Dana – FSDP-34 view community photos, FSDP-46 delete own photo
//        Lennox – FSDP-42 add a note for the hawker, add to cart
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useCart } from '../cart.jsx';
import { formatMoney } from '../format.js';
import FoodImage from '../components/FoodImage.jsx';
import Icon from '../components/Icon.jsx';
import Stepper from '../components/Stepper.jsx';
import VoteButton from '../components/VoteButton.jsx';
import QueuePill from '../components/QueuePill.jsx';
import { ErrorState, LoadingCards } from '../components/States.jsx';
import './Browse.css';

const NOTE_MAX = 80;
const QUICK_NOTES = ['Less rice', 'No spring onion', 'Extra chilli', 'Takeaway'];

export default function DishPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const cart = useCart();
  const [dish, setDish] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [busyPhoto, setBusyPhoto] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const load = useCallback(() => {
    setError('');
    Promise.all([api.getDish(itemId), api.getPhotos(itemId)])
      .then(([d, p]) => { setDish(d); setPhotos(p); })
      .catch((e) => setError(e.status === 404 ? 'We couldn’t find that dish.' : 'Couldn’t load this dish. Try again.'));
  }, [itemId]);

  useEffect(load, [load]);

  async function toggleVote(photo) {
    if (!user) return navigate('/login', { state: { from: `/dishes/${itemId}` } });
    setPhotoError('');
    setBusyPhoto(photo.id);
    // Update the screen straight away, then confirm with the server
    const optimistic = (p) => (p.id === photo.id ? { ...p, votedByMe: !p.votedByMe, votes: p.votes + (p.votedByMe ? -1 : 1) } : p);
    setPhotos((prev) => prev.map(optimistic));
    try {
      const res = photo.votedByMe ? await api.unvote(photo.id) : await api.vote(photo.id);
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, votes: res.votes, votedByMe: res.voted } : p)));
    } catch (err) {
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? photo : p)));
      setPhotoError(err.message);
    } finally {
      setBusyPhoto(null);
    }
  }

  async function deletePhoto(photo) {
    if (!window.confirm('Delete your photo? Its votes will be lost.')) return;
    setPhotoError('');
    setBusyPhoto(photo.id);
    try {
      await api.deletePhoto(photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setBusyPhoto(null);
    }
  }

  function addToCart() {
    cart.add(dish, dish.stall, quantity, notes);
    navigate(`/stalls/${dish.stall.id}`);
  }

  if (error) return <><BackOnly /><ErrorState message={error} onRetry={load} /></>;
  if (!dish) return <><BackOnly /><LoadingCards count={3} /></>;

  const top = photos[0];
  const canOrder = dish.isAvailable && dish.stall.isOpen;

  return (
    <>
      <div className="hero dish-hero">
        <FoodImage src={top?.url || dish.photoUrl} alt={dish.name} className="" />
        <div className="hero-actions">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)} aria-label="Go back"><Icon name="back" /></button>
          <Link to={`/dishes/${itemId}/upload`} className="icon-btn" aria-label="Add your photo"><Icon name="camera" /></Link>
        </div>
        {top && (
          <div className="dish-photo-meta">
            <span>Top photo by {top.uploadedBy}</span>
            <span className="row-tight"><Icon name="up" size={13} strokeWidth={2.6} /> {top.votes}</span>
          </div>
        )}
      </div>

      <div className="hero-card">
        <div className="between">
          <h1>{dish.name}</h1>
          <span className="price summary-total">{formatMoney(dish.priceCents)}</span>
        </div>
        <Link to={`/stalls/${dish.stall.id}`} className="muted">{dish.stall.name} · {dish.stall.unitNo}</Link>
        {dish.description && <p className="dish-desc">{dish.description}</p>}
        <div className="pills">
          <QueuePill minutes={dish.stall.estimatedMinutes} isOpen={dish.stall.isOpen} />
          {!dish.isAvailable && <span className="pill q-busy">Sold out</span>}
        </div>
      </div>

      <div className="section-head">
        <h2>Community photos</h2>
        <span className="muted small">{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</span>
      </div>
      <p className="muted small photo-help">Tap ↑ on the best one. The most voted photo becomes the menu picture.</p>
      {photoError && <p className="error" role="alert">{photoError}</p>}

      <div className="photo-grid">
        {photos.map((p, i) => (
          <div key={p.id} className="photo-tile">
            <FoodImage src={p.url} alt={`${dish.name} photo by ${p.uploadedBy}`} className="" />
            {i === 0 && <span className="pill cdc tile-badge"><Icon name="star" size={12} /> Menu photo</span>}
            {p.isMine && (
              <button type="button" className="icon-btn tile-delete" onClick={() => deletePhoto(p)} disabled={busyPhoto === p.id} aria-label="Delete your photo">
                <Icon name="trash" size={16} />
              </button>
            )}
            <div className="tile-bar">
              <span className="photo-by">{p.isMine ? 'You' : p.uploadedBy}</span>
              <VoteButton votes={p.votes} voted={p.votedByMe} busy={busyPhoto === p.id} onToggle={() => toggleVote(p)} />
            </div>
          </div>
        ))}
        <Link to={`/dishes/${itemId}/upload`} className="photo-add">
          <Icon name="camera" size={26} /> Add your photo
        </Link>
      </div>

      {canOrder && (
        <div className="field notes-field">
          <label htmlFor="dish-notes">Note for the hawker <span className="hint">(optional)</span></label>
          <div className="chips">
            {QUICK_NOTES.map((n) => (
              <button key={n} type="button" className="chip" aria-pressed={notes.split(',').map((x) => x.trim()).includes(n)}
                onClick={() => setNotes((cur) => toggleNote(cur, n))}>
                {n}
              </button>
            ))}
          </div>
          <textarea id="dish-notes" value={notes} maxLength={NOTE_MAX} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. less rice, sauce on the side" />
          <span className="hint">{notes.length}/{NOTE_MAX}</span>
        </div>
      )}

      <div className="sticky-bar">
        {canOrder ? (
          <>
            <Stepper value={quantity} onChange={setQuantity} />
            <button type="button" className="btn-primary grow" onClick={addToCart}>
              Add · {formatMoney(dish.priceCents * quantity)}
            </button>
          </>
        ) : (
          <button type="button" className="btn-primary" disabled>{dish.isAvailable ? 'Stall is closed' : 'Sold out'}</button>
        )}
      </div>
    </>
  );
}

// Adds a quick note to the text, or takes it out if it's already there
function toggleNote(current, note) {
  const parts = current.split(',').map((x) => x.trim()).filter(Boolean);
  const next = parts.includes(note) ? parts.filter((x) => x !== note) : [...parts, note];
  return next.join(', ').slice(0, NOTE_MAX);
}

function BackOnly() {
  const navigate = useNavigate();
  return (
    <div className="page-head">
      <button type="button" className="icon-btn" onClick={() => navigate(-1)} aria-label="Go back"><Icon name="back" /></button>
    </div>
  );
}