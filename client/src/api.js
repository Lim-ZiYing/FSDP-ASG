// Every call to the back end goes through here, so the base URL and token live in one place.
//
// FAKE DATA ("mock mode") – so the whole app works before every route is built:
//   VITE_MOCK=unbuilt  (default while developing) – functions listed in NOT_READY use fake data from mocks.js,
//                      everything else calls the real server.
//   VITE_MOCK=all      – everything is fake (no server needed, good for showing the design).
//   VITE_MOCK=off      – everything calls the real server (the default for a production build).
// Set it in client/.env, e.g.  VITE_MOCK=all   then restart `npm run dev`.
//
// HOW TO CONNECT YOUR ROUTE: build it so it returns the same shape as your function in mocks.js,
// then delete your function's name from NOT_READY below. That's it – the screens don't change.
import { mockApi } from './mocks.js';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const TOKEN_KEY = 'token';
export const MOCK_MODE = import.meta.env.VITE_MOCK ?? (import.meta.env.DEV ? 'unbuilt' : 'off');

const NOT_READY = new Set([
  // Siyu
  'getCentres', 'getTopDishes', 'search', 'getDish', 'vote', 'unvote',
  // Dana
  'getPhotos', 'deletePhoto',
  // Lennox
  'getCollectionPoints', 'getPickupSlots', 'placeOrder', 'cancelOrder', 'myOrders', 'getOrder',
  // Declan
  'createNetsQr', 'paymentStatus',
  // Zi Ying
  'hawkerMenu', 'setItemSoldOut',
]);

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

const query = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
  return s ? `?${s}` : '';
};

// The real server calls. The comment above each function in mocks.js shows the shape it must return.
const realApi = {
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
  hawkerMenu: () => request('/hawker/menu'),
  setItemSoldOut: (itemId, isSoldOut) =>
    request(`/hawker/menu-items/${itemId}/sold-out`, { method: 'PATCH', body: { isSoldOut } }),
  trackOrder: (orderId) => request(`/track/${orderId}`),

  // Centres, stalls, search and eMenu – Siyu
  getCentres: () => request('/centres'),
  getStalls: ({ centreId } = {}) => request(`/stalls${query({ centreId })}`),
  getStall: (stallId) => request(`/stalls/${stallId}`),
  getMenu: (stallId) => request(`/stalls/${stallId}/menu`),
  getDish: (itemId) => request(`/menu-items/${itemId}`),
  getTopDishes: (centreId) => request(`/centres/${centreId}/top-dishes`),
  search: (q, centreId) => request(`/search${query({ q, centreId })}`),

  // Voting – Siyu
  vote: (photoId) => request(`/votes/${photoId}`, { method: 'POST' }),
  unvote: (photoId) => request(`/votes/${photoId}`, { method: 'DELETE' }),

  // Orders – Lennox
  getCollectionPoints: (centreId) => request(`/centres/${centreId}/collection-points`),
  getPickupSlots: (centreId, stallIds) => request(`/orders/pickup-slots${query({ centreId, stallIds: stallIds.join(',') })}`),
  placeOrder: (order) => request('/orders', { method: 'POST', body: order }),
  cancelOrder: (orderId) => request(`/orders/${orderId}/cancel`, { method: 'POST' }),
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
  deletePhoto: (photoId) => request(`/photos/${photoId}`, { method: 'DELETE' }),
};

function useMock(name) {
  if (MOCK_MODE === 'all') return true;
  if (MOCK_MODE === 'unbuilt') return NOT_READY.has(name);
  return false;
}

// Pages import this. Each function picks real or fake when it's called.
export const api = Object.fromEntries(
  Object.keys(realApi).map((name) => [name, (...args) => (useMock(name) ? mockApi[name](...args) : realApi[name](...args))])
);

// True if any data on screen could be fake (shows the small "Demo data" badge)
export const usingMocks = MOCK_MODE === 'all' || (MOCK_MODE === 'unbuilt' && NOT_READY.size > 0);
export const isMocked = useMock;