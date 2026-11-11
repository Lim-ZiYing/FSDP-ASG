// Shared formatting helpers. Anyone can use these.

// 450 -> "$4.50"
export function formatMoney(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

// ISO time -> "12:15 pm" (Singapore style)
export function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' });
}