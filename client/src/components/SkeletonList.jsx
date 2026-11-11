// Owner: Siyu – grey placeholder cards shown while a list loads
export default function SkeletonList({ count = 4 }) {
  return (
    <div className="list" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card row skeleton-card" aria-hidden="true">
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