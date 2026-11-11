// Owner: Zi Ying – the food photo header on Log in and Sign up.
import Icon from './Icon.jsx';
import { MOCK_MODE } from '../api.js';

export default function AuthHero({ tagline }) {
  return (
    <div className="auth-hero">
      <span className="auth-logo"><span><Icon name="plate" size={20} /></span> Hawker eMenu</span>
      <p>{tagline}</p>
    </div>
  );
}

// Only shown when login is fake (VITE_MOCK=all), so testers know what to type
export function DemoLoginHint() {
  if (MOCK_MODE !== 'all') return null;
  return (
    <p className="demo-hint small muted">
      <strong>Demo mode:</strong> any email and password works. Use an email starting with <strong>hawker</strong> (e.g. hawker@example.com) to see the hawker dashboard.
    </p>
  );
}