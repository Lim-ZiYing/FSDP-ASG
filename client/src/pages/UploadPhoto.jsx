// Owner: Dana – FSDP-20 upload dish photo (AI check result shown here, FSDP-21)
// Reached two ways:
//   /dishes/:itemId/upload  from a dish page, the dish is already known
//   /snap                   from the bottom nav, pick the stall and dish first
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import './UploadPhoto.css';

const MAX_BYTES = 5 * 1024 * 1024;
const FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const STATUS_MESSAGE = {
  approved: 'Thanks! Your photo is live. Get upvotes and it could become the menu picture.',
  review: 'Thanks! A quick check is needed before your photo goes live.',
  pending: 'Thanks! Your photo will show once it has been checked.',
};

export default function UploadPhoto() {
  const params = useParams();
  const [stalls, setStalls] = useState([]);
  const [menu, setMenu] = useState([]);
  const [stallId, setStallId] = useState('');
  const [itemId, setItemId] = useState(params.itemId || '');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const pickDish = !params.itemId;

  // /snap: load stalls, then the chosen stall's dishes
  useEffect(() => {
    if (!pickDish) return;
    api.getStalls().then(setStalls).catch(() => setError("Couldn't load stalls. Open a dish from its stall page instead."));
  }, [pickDish]);

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
    setError('');
    setResult(null);
    if (!chosen) return;
    if (!FILE_TYPES.includes(chosen.type)) {
      setError('Choose a JPG, PNG or WebP photo');
      return;
    }
    if (chosen.size > MAX_BYTES) {
      setError('Photo must be 5 MB or smaller');
      return;
    }
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
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
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <section className="upload">
        <h1>Photo sent</h1>
        <img className="upload-preview" src={result.url} alt="Your uploaded dish" />
        <p role="status">{STATUS_MESSAGE[result.status] || STATUS_MESSAGE.pending}</p>
        <button type="button" className="btn-primary" onClick={() => setResult(null)}>Upload another</button>
        <Link to={`/dishes/${result.itemId}`} className="link center">See photos for this dish</Link>
      </section>
    );
  }

  return (
    <form className="upload auth-form" onSubmit={handleSubmit} noValidate>
      <h1>Snap your dish</h1>
      <p className="muted">Share a photo of what you ordered. The most upvoted photo becomes the menu picture.</p>

      {pickDish && (
        <>
          <label>
            Stall
            <select value={stallId} onChange={(e) => setStallId(e.target.value)}>
              <option value="">Choose a stall</option>
              {stalls.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label>
            Dish
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} disabled={!stallId}>
              <option value="">Choose a dish</option>
              {menu.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
        </>
      )}

      <label className="upload-drop">
        {preview
          ? <img className="upload-preview" src={preview} alt="Preview of your photo" />
          : <span>Tap to take or choose a photo<br /><span className="hint">JPG, PNG or WebP, up to 5 MB</span></span>}
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFile} />
      </label>

      {error && <p className="error" role="alert">{error}</p>}

      <button type="submit" className="btn-primary" disabled={busy || !file}>
        {busy ? 'Checking your photo…' : 'Upload photo'}
      </button>
    </form>
  );
}
