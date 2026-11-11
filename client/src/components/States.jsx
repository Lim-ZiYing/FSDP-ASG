// Owner: Zi Ying – what a screen shows while loading, when empty, or when something fails.
import Icon from './Icon.jsx';

export function EmptyState({ icon = 'plate', title, text, children }) {
  return (
    <div className="empty">
      <span className="empty-icon"><Icon name={icon} size={26} /></span>
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty" role="alert">
      <span className="empty-icon"><Icon name="alert" size={26} /></span>
      <p className="error">{message}</p>
      {onRetry && (
        <button type="button" className="btn-outline btn-sm" onClick={onRetry}>
          <Icon name="refresh" size={16} /> Try again
        </button>
      )}
    </div>
  );
}

export function LoadingCards({ count = 4 }) {
  return (
    <div className="list" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card row" aria-hidden="true">
          <div className="thumb skeleton" />
          <div className="grow">
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}