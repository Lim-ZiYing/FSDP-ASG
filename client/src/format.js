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

// ISO time -> "Wed, 11 Nov"
export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ISO time -> whole minutes from now (never below 0)
export function minutesFromNow(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000));
}

// "Lim Zi Ying" -> "LZ"
export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
}