// Owner: Siyu – FSDP-22 one-tap upvote for a community photo.
// Shows the count and whether you voted. The parent page does the api call in onToggle.
import Icon from './Icon.jsx';

export default function VoteButton({ votes, voted, onToggle, busy, light = false }) {
  return (
    <button
      type="button"
      className={`vote ${voted ? 'vote-on' : ''} ${light ? 'vote-light' : ''}`}
      aria-pressed={voted}
      aria-label={`${voted ? 'Remove your upvote' : 'Upvote this photo'}, ${votes} ${votes === 1 ? 'vote' : 'votes'}`}
      onClick={onToggle}
      disabled={busy}
    >
      <Icon name="up" size={16} strokeWidth={2.6} /> {votes}
    </button>
  );
}