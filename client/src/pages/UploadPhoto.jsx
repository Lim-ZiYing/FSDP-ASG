// Owner: Dana – FSDP-20 upload dish photo, FSDP-21 AI rejects photos that aren't food
// Reached two ways:
//   /dishes/:itemId/upload  from a dish page, the dish is already known
//   /snap                   from the bottom nav, pick the stall and dish first
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useCentre } from '../centre.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Icon from '../components/Icon.jsx';
import './UploadPhoto.css';

const MAX_BYTES = 5 * 1024 * 1024;
const FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const STATUS_MESSAGE = {
  approved: 'Your photo is live. Get upvotes and it could become the menu picture.',
  review: 'A quick check is needed before your photo goes live.',
  pending: 'Your photo will show once it has been checked.',
};

export default function UploadPhoto() {
  const params = useParams();
  const { centreId } = useCentre();
  const [stalls, setStalls] = useState([]);
  const [menu, setMenu] = useState([]);
  const [stallId, setStallId] = useState('');
  const [itemId, setItemId] = useState(params.itemId || '');
  const [dishName, setDishName] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [rejected, setRejected] = useState(''); // FSDP-21: the AI said "not food"
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const pickDish = !params.itemId;

  // From a dish page: show which dish this is for
  useEffect(() => {
    if (pickDish) return;
    api.getDish(params.itemId).then((d) => setDishName(`${d.name} · ${d.stall.name}`)).catch(() => {});
  }, [pickDish, params.itemId]);

  // /snap: load stalls, then the chosen stall's dishes
  useEffect(() => {
    if (!pickDish) return;
    api.getStalls({ centreId }).then(setStalls).catch(() => setError("Couldn't load stalls. Open a dish from its stall page instead."));
  }, [pickDish, centreId]);

  useEffect(() => {
    if (!pickDish || !stallId) return;
    setItemId('');
    setMenu([]);
    api.getMenu(stallId).then(setMenu).catch(() => setError("Couldn't load that stall's menu."));
  }, [pickDish, stallId]);

  // Free the preview image when it changes or the page closes
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function handleFile(e) {
    const chosen = e.target.files[0];
    e.target.value = ''; // lets you pick the same file again
    setError('');
    setRejected('');
    setResult(null);
    if (!chosen) return;
    if (!FILE_TYPES.includes(chosen.type)) return setError('Choose a JPG, PNG or WebP photo');
    if (chosen.size > MAX_BYTES) return setError('Photo must be 5 MB or smaller');
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setRejected('');
    if (!itemId) return setError('Choose the dish first');
    if (!file) return setError('Choose a photo first');

    const form = new FormData();
    form.append('photo', file);
    setBusy(true);
    try {
      const { photo } = await api.uploadPhoto(itemId, form);
      setResult(photo);
      setFile(null);
      setPreview('');
    } catch (err) {
      if (err.status === 422) setRejected(err.message);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <section className="upload upload-done">
        <span className="confirmed-tick-sm"><Icon name="check" size={32} strokeWidth={3} /></span>
        <h1>Thanks for sharing!</h1>
        <img className="upload-preview" src={result.url} alt="Your uploaded dish" />
        <p role="status">{STATUS_MESSAGE[result.status] || STATUS_MESSAGE.pending}</p>
        <Link to={`/dishes/${result.itemId}`} className="btn-primary">See it on the dish page</Link>
        <button type="button" className="btn-outline" onClick={() => setResult(null)}>Upload another</button>
      </section>
    );
  }

  return (
    <form className="upload" onSubmit={handleSubmit} noValidate>
      {pickDish ? <h1>Snap your dish</h1> : <PageHeader title="Add your photo" />}
      {dishName && <p className="upload-dish"><strong>{dishName}</strong></p>}
      <p className="muted">Share a photo of what you ordered. The most upvoted photo becomes the menu picture.</p>

      {pickDish && (
        <div className="upload-pickers">
          <label className="field">
            Stall
            <select value={stallId} onChange={(e) => setStallId(e.target.value)}>
              <option value="">Choose a stall</option>
              {stalls.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="field">
            Dish
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} disabled={!stallId}>
              <option value="">Choose a dish</option>
              {menu.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
        </div>
      )}

      <label className={`upload-drop ${preview ? 'has-photo' : ''} ${rejected ? 'is-rejected' : ''}`}>
        {preview ? (
          <img className="upload-preview" src={preview} alt="Preview of your photo" />
        ) : (
          <>
            <span className="empty-icon"><Icon name="camera" size={28} /></span>
            <strong>Tap to take or choose a photo</strong>
            <span className="hint">JPG, PNG or WebP, up to 5 MB</span>
          </>
        )}
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFile} />
      </label>
      {preview && <p className="center"><span className="link-btn">Tap the photo to change it</span></p>}

      {rejected && (
        <div className="notice notice-red" role="alert">
          <Icon name="alert" />
          <div><strong>Photo not accepted</strong><br />{rejected}</div>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}

      <div className="upload-tips">
        <p className="eyebrow">Tips for a great photo</p>
        <ul>
          <li>Shoot from above in good light</li>
          <li>Only the food, no faces or receipts</li>
          <li>Our AI checks every photo is really food</li>
        </ul>
      </div>

      <button type="submit" className="btn-primary" disabled={busy || !file}>
        {busy ? 'Checking your photo…' : <><Icon name="up" /> Upload photo</>}
      </button>
    </form>
  );
}