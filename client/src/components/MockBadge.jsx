// Owner: Zi Ying – small "Demo data" label while some screens use fake data (see api.js).
import { usingMocks } from '../api.js';

export default function MockBadge() {
  return usingMocks ? <span className="mock-badge" title="Some data on screen is fake until every server route is built">Demo data</span> : null;
}