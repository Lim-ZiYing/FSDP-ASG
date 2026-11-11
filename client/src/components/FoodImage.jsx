// Owner: Siyu – photo that never shows a broken-image icon
import { useEffect, useState } from 'react';

export default function FoodImage({ src, alt = '', className = 'thumb' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) return <div className={`${className} placeholder`} aria-hidden="true" />;
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}