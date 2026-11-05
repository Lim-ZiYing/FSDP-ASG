// Every call to the back end goes through here, so the base URL and token live in one place.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  getStalls: () => request('/stalls'),
  getMenu: (stallId) => request(`/stalls/${stallId}/menu`),
  getPhotos: (itemId) => request(`/photos/item/${itemId}`),
  vote: (photoId) => request(`/photos/${photoId}/vote`, { method: 'POST' }),
  unvote: (photoId) => request(`/photos/${photoId}/vote`, { method: 'DELETE' }),
  placeOrder: (order) => request('/orders', { method: 'POST', body: order }),
  myOrders: () => request('/orders/mine'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (name, email, password) => request('/auth/register', { method: 'POST', body: { name, email, password } }),
};
