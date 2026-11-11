// Owner: Siyu (restyled by Zi Ying) – photo that never shows a broken-image icon
import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

export default function FoodImage({ src, alt = '', className = 'thumb' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div className={`${className} placeholder`} aria-hidden="true">
        <Icon name="plate" size={26} strokeWidth={1.6} />
      </div>
    );
  }
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