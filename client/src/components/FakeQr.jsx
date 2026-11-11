// Owner: Declan – draws a QR-looking picture from text, for demo mode only.
// When the real NETS API gives back a QR image (qrImage), the payment page shows that instead.
export default function FakeQr({ text, size = 200 }) {
  const n = 25;
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rand = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
  const finder = (x, y) => [x, y, x + 6, y + 6];
  const finders = [finder(0, 0), finder(n - 7, 0), finder(0, n - 7)];
  const inFinder = (x, y) => finders.some(([a, b, c, d]) => x >= a - 1 && x <= c + 1 && y >= b - 1 && y <= d + 1);
  const cells = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inFinder(x, y) && rand() > 0.5) cells.push(`M${x} ${y}h1v1h-1z`);
  return (
    <svg width={size} height={size} viewBox={`-2 -2 ${n + 4} ${n + 4}`} role="img" aria-label="Payment QR code" shapeRendering="crispEdges">
      <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" />
      <path d={cells.join('')} fill="#2B1D14" />
      {finders.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="7" height="7" fill="#2B1D14" />
          <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
          <rect x={x + 2} y={y + 2} width="3" height="3" fill="#2B1D14" />
        </g>
      ))}
    </svg>
  );
}