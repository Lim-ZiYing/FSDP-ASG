// Every call to the back end goes through here, so the base URL and token live in one place.
// Each area's calls are already listed – fill in your server route and they start working.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const TOKEN_KEY = 'token';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token) {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // Accounts – Zi Ying
  register: (displayName, email, password) =>
    request('/auth/register', { method: 'POST', body: { displayName, email, password } }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Hawker side – Zi Ying
  hawkerOrders: () => request('/hawker/orders'),
  updateStallOrderStatus: (stallOrderId, status) =>
    request(`/hawker/orders/${stallOrderId}/status`, { method: 'PATCH', body: { status } }),
  trackOrder: (orderId) => request(`/track/${orderId}`),

  // Stalls and eMenu – Siyu
  getStalls: () => request('/stalls'),
  getStall: (stallId) => request(`/stalls/${stallId}`),
  getMenu: (stallId) => request(`/stalls/${stallId}/menu`),

  // Voting – Siyu
  vote: (photoId) => request(`/votes/${photoId}`, { method: 'POST' }),
  unvote: (photoId) => request(`/votes/${photoId}`, { method: 'DELETE' }),

  // Orders – Lennox
  placeOrder: (order) => request('/orders', { method: 'POST', body: order }),
  myOrders: () => request('/orders/mine'),
  getOrder: (orderId) => request(`/orders/${orderId}`),

  // Payments – Declan
  createNetsQr: (orderId) => request(`/payments/${orderId}/nets-qr`, { method: 'POST' }),
  paymentStatus: (orderId) => request(`/payments/${orderId}/status`),

  // Photos – Dana
  getPhotos: (itemId) => request(`/photos/item/${itemId}`),
  getTopPhoto: (itemId) => request(`/photos/item/${itemId}/top`),
  uploadPhoto: (itemId, formData) =>
    request(`/photos/item/${itemId}`, { method: 'POST', body: formData, isForm: true }),
};
