// Owner: Zi Ying – the live queue label, coloured AND worded so colour isn't the only signal.
import Icon from './Icon.jsx';

export function queueLevel(minutes) {
  if (minutes <= 7) return { label: 'Short queue', className: 'q-short' };
  if (minutes <= 15) return { label: 'Medium queue', className: 'q-medium' };
  return { label: 'Busy', className: 'q-busy' };
}

export default function QueuePill({ minutes, isOpen = true, prefix = '' }) {
  if (!isOpen) return <span className="pill">Closed now</span>;
  const q = queueLevel(minutes);
  return (
    <span className={`pill ${q.className}`}>
      <Icon name="clock" size={13} strokeWidth={2.4} />
      {q.label} · {prefix}~{minutes} min
    </span>
  );
}