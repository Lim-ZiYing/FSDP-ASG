// Owner: Zi Ying – a panel that slides up from the bottom (centre picker, account menu).
// Closes on the backdrop, the Close button or the Escape key.
import { useEffect, useRef } from 'react';

export default function Sheet({ title, onClose, children }) {
  const panel = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        ref={panel}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="between">
          <h2>{title}</h2>
          <button type="button" className="link-btn" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}