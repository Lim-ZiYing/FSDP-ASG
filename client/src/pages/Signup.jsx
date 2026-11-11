// Owner: Zi Ying – FSDP-10 sign up
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import AuthHero, { DemoLoginHint } from '../components/AuthHero.jsx';

const MIN_PASSWORD_LENGTH = 8;

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    // Quick checks here for fast feedback; the server checks again
    if (!displayName.trim() || !email.trim() || !password) {
      setError('Fill in your name, email and password');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords don’t match');
      return;
    }
    setBusy(true);
    try {
      await signup(displayName, email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AuthHero tagline="Order from any stall. One payment, one pick-up." />
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <h1>Create account</h1>

        <label className="field">
          Name
          <input type="text" autoComplete="name" value={displayName} maxLength={50}
            onChange={(e) => setDisplayName(e.target.value)} placeholder="Tan Wei Ming" />
        </label>
        <label className="field">
          Email
          <input type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </label>
        <label className="field">
          Password
          <input type="password" autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)} />
          <span className="hint">At least {MIN_PASSWORD_LENGTH} characters</span>
        </label>
        <label className="field">
          Confirm password
          <input type="password" autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} />
        </label>

        {error && <p className="notice notice-red" role="alert">{error}</p>}

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="muted center auth-switch">Already have an account? <Link to="/login" className="link">Log in</Link></p>
      <DemoLoginHint />
    </>
  );
}