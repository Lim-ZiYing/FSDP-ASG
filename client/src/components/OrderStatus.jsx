// Owner: Zi Ying – FSDP-48
// Live progress: Paid → Preparing → Ready → Collected.
import Icon from './Icon.jsx';

const STEPS = [
  { key: 'paid', label: 'Paid' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'collected', label: 'Collected' },
];

export default function OrderStatus({ status }) {
  const current = STEPS.findIndex((s) => s.key === status);

  return (
    <ol className="order-steps" aria-label="Order progress">
      {STEPS.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={step.key} className={`step step-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="step-dot" aria-hidden="true">{state === 'done' ? <Icon name="check" size={16} strokeWidth={3} /> : i + 1}</span>
            <span className="step-label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}