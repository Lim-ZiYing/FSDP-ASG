// Owner: Zi Ying – the − 1 + quantity control.
import Icon from './Icon.jsx';

export default function Stepper({ value, onChange, min = 1, max = 20, label = 'Quantity' }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease">
        <Icon name="minus" size={16} strokeWidth={2.4} />
      </button>
      <span aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase">
        <Icon name="plus" size={16} strokeWidth={2.4} />
      </button>
    </div>
  );
}