import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password');
      return;
    }
    setBusy(true);
    try {
      const user = await login(email, password);
      // Hawkers go to their dashboard; customers go back where they came from
      const fallback = user.role === 'hawker' ? '/hawker' : '/';
      navigate(location.state?.from || fallback, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <h1>Log in</h1>
      <p className="muted">Skip the queue. Order ahead, collect when it’s ready.</p>

      <label>
        Email
        <input type="email" autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
      </label>
      <label>
        Password
        <input type="password" autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)} />
      </label>

      {error && <p className="error" role="alert">{error}</p>}

      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? 'Logging in…' : 'Log in'}
      </button>
      <p className="muted center">New here? <Link to="/signup" className="link">Create an account</Link></p>
    </form>
  );
}
