// Owner: Zi Ying – FAKE data so every screen works before its server route is built.
//
// Each function here has the SAME name, inputs and output shape as the real one in api.js.
// That shape is the agreement ("contract") with the teammate who builds the real route:
// when your route returns the same shape, delete your function's name from NOT_READY in api.js
// and the screen uses the real server, with no changes to the screen.
//
// The fake database is saved in this browser (localStorage), so orders survive a page refresh.
// Use mockTools.reset() in the browser console to start again.
import { getToken } from './api.js';

const DB_KEY = 'hawker-emenu-mockdb-v1';
const IMG = (name) => `/mock/${name}.svg`;
const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = (x) => JSON.parse(JSON.stringify(x));
const nowIso = () => new Date().toISOString();
const addMinutes = (iso, mins) => new Date(new Date(iso).getTime() + mins * 60000).toISOString();

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// ---------------- Reference data (matches Dana's seed data where it overlaps) ----------------
const CENTRES = [
  { id: 1, name: 'Maxwell Food Centre', address: '1 Kadayanallur St, Singapore 069184' },
  { id: 2, name: 'Amoy Street Food Centre', address: '7 Maxwell Rd, Singapore 069111' },
];

const POINTS = [
  { id: 1, centreId: 1, name: 'Collection Point A', note: 'Beside Stall #01-12' },
  { id: 2, centreId: 1, name: 'Collection Point B', note: 'Near the main entrance' },
  { id: 3, centreId: 2, name: 'Collection Point A', note: 'Level 1, beside the lift' },
];

const STALLS = [
  { id: 1, centreId: 1, name: 'Ah Hock Chicken Rice', cuisine: 'Chicken rice', unitNo: '#01-12', acceptsCdc: true, isOpen: true, photo: 'chicken-rice', ordersAhead: 1, avgPrep: 5 },
  { id: 2, centreId: 1, name: 'Lao Ban Laksa', cuisine: 'Laksa', unitNo: '#01-20', acceptsCdc: true, isOpen: true, photo: 'laksa', ordersAhead: 5, avgPrep: 12 },
  { id: 3, centreId: 1, name: 'Ahmad Nasi Lemak', cuisine: 'Malay', unitNo: '#02-11', acceptsCdc: false, isOpen: true, photo: 'nasi-lemak', ordersAhead: 2, avgPrep: 8 },
  { id: 4, centreId: 1, name: 'Teh Tarik Corner', cuisine: 'Drinks', unitNo: '#01-03', acceptsCdc: true, isOpen: true, photo: 'teh', ordersAhead: 0, avgPrep: 2 },
  { id: 5, centreId: 2, name: 'Amoy Char Siew', cuisine: 'Roast meats', unitNo: '#01-07', acceptsCdc: true, isOpen: true, photo: 'char-siew', ordersAhead: 2, avgPrep: 6 },
  { id: 6, centreId: 2, name: 'Uncle Lim Noodles', cuisine: 'Noodles', unitNo: '#02-15', acceptsCdc: false, isOpen: false, photo: 'noodles', ordersAhead: 0, avgPrep: 7 },
];

const ITEMS = [
  { id: 1, stallId: 1, name: 'Roasted Chicken Rice', description: 'Roasted chicken on fragrant rice, with chilli, ginger and dark soy', priceCents: 450, category: 'Rice', prepMinutes: 5, photo: 'chicken-rice' },
  { id: 2, stallId: 1, name: 'Steamed Chicken Rice', description: 'Silky poached chicken on fragrant rice', priceCents: 450, category: 'Rice', prepMinutes: 5, photo: 'chicken-rice-steamed' },
  { id: 3, stallId: 1, name: 'Char Siew Rice', description: 'Sweet BBQ pork on rice', priceCents: 500, category: 'Rice', prepMinutes: 5, photo: 'char-siew' },
  { id: 4, stallId: 1, name: 'Braised Egg', description: 'Soy-braised egg', priceCents: 100, category: 'Sides', prepMinutes: 1, photo: 'egg', soldOut: true },
  { id: 15, stallId: 1, name: 'Chicken Rice Set', description: 'Roasted chicken rice with braised egg and soup', priceCents: 650, category: 'Sets', prepMinutes: 6, photo: 'chicken-rice' },
  { id: 5, stallId: 2, name: 'Curry Laksa', description: 'Spicy coconut noodle soup with prawns and tau pok', priceCents: 580, category: 'Noodles', prepMinutes: 8, photo: 'laksa' },
  { id: 14, stallId: 2, name: 'Laksa with Extra Cockles', description: 'Our classic laksa, extra cockles', priceCents: 700, category: 'Noodles', prepMinutes: 8, photo: 'laksa' },
  { id: 7, stallId: 2, name: 'Iced Milo', description: null, priceCents: 150, category: 'Drinks', prepMinutes: 1, photo: 'milo' },
  { id: 6, stallId: 3, name: 'Nasi Lemak', description: 'Coconut rice with sambal, egg, ikan bilis and peanuts', priceCents: 550, category: 'Rice', prepMinutes: 6, photo: 'nasi-lemak' },
  { id: 8, stallId: 3, name: 'Nasi Lemak with Chicken Wing', description: 'Coconut rice, sambal, fried chicken wing', priceCents: 650, category: 'Rice', prepMinutes: 7, photo: 'nasi-lemak' },
  { id: 9, stallId: 4, name: 'Teh Tarik', description: 'Pulled milk tea', priceCents: 150, category: 'Drinks', prepMinutes: 2, photo: 'teh' },
  { id: 10, stallId: 4, name: 'Kopi O', description: 'Black coffee with sugar', priceCents: 120, category: 'Drinks', prepMinutes: 1, photo: 'teh' },
  { id: 11, stallId: 5, name: 'Char Siew Noodles', description: 'Egg noodles with BBQ pork', priceCents: 550, category: 'Noodles', prepMinutes: 6, photo: 'char-siew' },
  { id: 12, stallId: 5, name: 'Roast Pork Rice', description: 'Crispy roast pork on rice', priceCents: 600, category: 'Rice', prepMinutes: 6, photo: 'char-siew' },
  { id: 13, stallId: 6, name: 'Wanton Mee', description: 'Springy noodles with wantons', priceCents: 500, category: 'Noodles', prepMinutes: 7, photo: 'noodles' },
];

// ---------------- The fake database (saved in this browser) ----------------
function seed() {
  const t = nowIso();
  return {
    nextId: { user: 10, photo: 20, order: 4, stallOrder: 10 },
    users: [
      { id: 'mock-customer', displayName: 'Mei Ling', email: 'meiling@example.com', role: 'customer' },
      { id: 'mock-hawker', displayName: 'Ah Hock', email: 'hawker@example.com', role: 'hawker' },
    ],
    stallOwners: { 1: 'mock-hawker' },
    soldOut: Object.fromEntries(ITEMS.filter((i) => i.soldOut).map((i) => [i.id, true])),
    photos: [
      { id: 1, itemId: 1, url: IMG('chicken-rice'), userId: 'u-foodie', uploadedBy: '@foodie_sg', votes: 128, createdAt: addMinutes(t, -9000) },
      { id: 2, itemId: 1, url: IMG('chicken-rice-2'), userId: 'u-raj', uploadedBy: '@raj', votes: 32, createdAt: addMinutes(t, -7000) },
      { id: 3, itemId: 1, url: IMG('chicken-rice-steamed'), userId: 'u-wj', uploadedBy: '@weijie', votes: 9, createdAt: addMinutes(t, -3000) },
      { id: 4, itemId: 2, url: IMG('chicken-rice-steamed'), userId: 'u-raj', uploadedBy: '@raj', votes: 74, createdAt: addMinutes(t, -8000) },
      { id: 5, itemId: 3, url: IMG('char-siew'), userId: 'u-foodie', uploadedBy: '@foodie_sg', votes: 52, createdAt: addMinutes(t, -8500) },
      { id: 6, itemId: 5, url: IMG('laksa'), userId: 'u-ml', uploadedBy: '@meiling', votes: 96, createdAt: addMinutes(t, -9500) },
      { id: 7, itemId: 6, url: IMG('nasi-lemak'), userId: 'u-raj', uploadedBy: '@raj', votes: 81, createdAt: addMinutes(t, -9100) },
      { id: 8, itemId: 9, url: IMG('teh'), userId: 'u-wj', uploadedBy: '@weijie', votes: 40, createdAt: addMinutes(t, -6000) },
      { id: 9, itemId: 11, url: IMG('char-siew'), userId: 'u-ml', uploadedBy: '@meiling', votes: 23, createdAt: addMinutes(t, -5000) },
    ],
    votes: {}, // "userId:photoId" -> true
    orders: [
      sampleOrder(1, 'mock-other', [[1, [[1, 2, 'Less rice']]], [2, [[5, 1, null]]]], 'paid', 12),
      sampleOrder(2, 'mock-other', [[1, [[2, 1, 'No cucumber'], [4, 1, null]]]], 'preparing', 20),
      sampleOrder(3, 'mock-other', [[1, [[3, 1, null]]]], 'ready', 5),
    ],
  };
}

// Builds a ready-made order for the hawker dashboard demo
function sampleOrder(id, userId, parts, status, pickupInMins) {
  const createdAt = addMinutes(nowIso(), -6);
  const stalls = parts.map(([stallId, lines], i) => ({
    id: id * 3 + i,
    stallId,
    status: stallId === 1 ? status : 'preparing',
    manual: true,
    estimatedReadyAt: addMinutes(createdAt, 10 + i * 4),
    items: lines.map(([itemId, quantity, notes]) => ({ itemId, quantity, notes, unitPriceCents: item(itemId).priceCents })),
  }));
  const totalCents = stalls.reduce((sum, s) => sum + s.items.reduce((a, l) => a + l.unitPriceCents * l.quantity, 0), 0);
  return {
    id, orderNo: `HK${1000 + id}`, userId, customerName: ['Raj', 'Wei Jie', 'Mei Ling'][id % 3],
    centreId: 1, collectionPointId: 1, asap: false, pickupTime: addMinutes(nowIso(), pickupInMins),
    status, totalCents, createdAt, paidAt: createdAt, collectedAt: null,
    payment: { status: 'success', ref: `NETS-${700000 + id}`, paidAt: createdAt }, stalls,
  };
}

let db = null;
function load() {
  if (db) return db;
  try { db = JSON.parse(localStorage.getItem(DB_KEY)); } catch { db = null; }
  if (!db || !db.nextId) db = seed();
  return db;
}
function save() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* storage blocked: data lasts until refresh */ }
}

function item(id) { return ITEMS.find((i) => i.id === Number(id)); }
function stall(id) { return STALLS.find((s) => s.id === Number(id)); }
function point(id) { return POINTS.find((p) => p.id === Number(id)); }

// Who is logged in? Works with fake tokens ("mock:<id>") and with real JWTs from Zi Ying's login.
function currentUser() {
  const token = getToken();
  if (!token) return null;
  const d = load();
  if (token.startsWith('mock:')) return d.users.find((u) => u.id === token.slice(5)) || null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return { id: payload.userId, role: payload.role, displayName: 'You' };
  } catch {
    return null;
  }
}
function requireUser() {
  const user = currentUser();
  if (!user) throw fail(401, 'Please log in');
  return user;
}

// ---------------- Shaping helpers (output = the contract) ----------------
function waitMinutes(s) { return Math.max(3, s.avgPrep + s.ordersAhead * 3); }

function toStall(s) {
  return {
    id: s.id, centreId: s.centreId, name: s.name, cuisine: s.cuisine, unitNo: s.unitNo,
    photoUrl: IMG(s.photo), acceptsCdc: s.acceptsCdc, isOpen: s.isOpen,
    ordersAhead: s.ordersAhead, estimatedMinutes: s.isOpen ? waitMinutes(s) : 0,
  };
}

function topPhoto(itemId) {
  return load().photos
    .filter((p) => p.itemId === itemId)
    .sort((a, b) => b.votes - a.votes || a.createdAt.localeCompare(b.createdAt))[0] || null;
}

function toMenuItem(i) {
  const top = topPhoto(i.id);
  return {
    id: i.id, stallId: i.stallId, name: i.name, description: i.description, priceCents: i.priceCents,
    category: i.category, prepMinutes: i.prepMinutes, isAvailable: !load().soldOut[i.id],
    photoUrl: top ? top.url : IMG(stall(i.stallId).photo), topPhotoId: top ? top.id : null, topPhotoVotes: top ? top.votes : 0,
  };
}

// Order status rule (same as Zi Ying's server): every stall ready -> order ready, etc.
function orderStatusFrom(stalls) {
  const s = stalls.map((x) => x.status);
  if (s.every((x) => x === 'collected')) return 'collected';
  if (s.every((x) => x === 'ready' || x === 'collected')) return 'ready';
  if (s.some((x) => x !== 'paid')) return 'preparing';
  return 'paid';
}

// So the customer's tracking page moves on its own in fake mode:
// ASAP orders: 10 s after paying -> preparing, then each stall becomes ready a few seconds apart.
// Orders for later stay "received" (a hawker would start just before the pick-up time).
function autoProgress(order) {
  if (!order.asap || !['paid', 'preparing'].includes(order.status) || !order.paidAt) return;
  const secs = (Date.now() - new Date(order.paidAt).getTime()) / 1000;
  order.stalls.forEach((part, i) => {
    if (part.manual) return;
    if (secs > 25 + i * 8) part.status = 'ready';
    else if (secs > 10) part.status = 'preparing';
  });
  order.status = orderStatusFrom(order.stalls);
}

function toTracking(o) {
  const cp = point(o.collectionPointId);
  return {
    id: o.id, orderNo: o.orderNo, status: o.status, pickupTime: o.pickupTime, asap: o.asap,
    totalCents: o.totalCents, createdAt: o.createdAt, collectedAt: o.collectedAt,
    collectionPoint: cp ? { name: cp.name, note: cp.note } : null,
    stalls: o.stalls.map((part) => ({
      id: part.id, stallId: part.stallId, name: stall(part.stallId).name, unitNo: stall(part.stallId).unitNo,
      status: part.status, estimatedReadyAt: part.estimatedReadyAt,
      items: part.items.map((l) => ({ itemId: l.itemId, name: item(l.itemId).name, quantity: l.quantity, notes: l.notes })),
    })),
  };
}

function toReceipt(o) {
  const base = toTracking(o);
  return {
    ...base,
    centreName: CENTRES.find((c) => c.id === o.centreId)?.name,
    payment: o.payment ? { method: 'NETS QR', status: o.payment.status, ref: o.payment.ref, paidAt: o.payment.paidAt } : null,
    stalls: o.stalls.map((part, i) => ({
      ...base.stalls[i],
      subtotalCents: part.items.reduce((a, l) => a + l.unitPriceCents * l.quantity, 0),
      items: part.items.map((l) => ({
        itemId: l.itemId, name: item(l.itemId).name, quantity: l.quantity, notes: l.notes,
        unitPriceCents: l.unitPriceCents, photoUrl: toMenuItem(item(l.itemId)).photoUrl,
      })),
    })),
  };
}

function findOrder(orderId, user) {
  const o = load().orders.find((x) => x.id === Number(orderId));
  if (!o || (user && o.userId !== user.id)) throw fail(404, 'Order not found');
  return o;
}

// ======================= The fake API =======================
export const mockApi = {
  // ---- Accounts (Zi Ying). Any password works; emails starting with "hawker" log in as a hawker.
  async register(displayName, email, password) {
    await wait();
    const d = load();
    email = String(email || '').trim().toLowerCase();
    if (!displayName || !email || !password) throw fail(400, 'Name, email and password are required');
    if (password.length < 8) throw fail(400, 'Password must be at least 8 characters');
    if (d.users.some((u) => u.email === email)) throw fail(409, 'That email is already registered');
    const user = { id: `mock-${d.nextId.user++}`, displayName, email, role: email.startsWith('hawker') ? 'hawker' : 'customer' };
    d.users.push(user);
    save();
    return { token: `mock:${user.id}`, user: { ...user, points: 0, language: 'en' } };
  },
  async login(email) {
    await wait();
    const d = load();
    email = String(email || '').trim().toLowerCase();
    let user = d.users.find((u) => u.email === email);
    if (!user) {
      user = { id: `mock-${d.nextId.user++}`, displayName: email.split('@')[0], email, role: email.startsWith('hawker') ? 'hawker' : 'customer' };
      d.users.push(user);
      save();
    }
    if (user.role === 'hawker' && !Object.values(d.stallOwners).includes(user.id)) { d.stallOwners[1] = user.id; save(); }
    return { token: `mock:${user.id}`, user: { ...user, points: 0, language: 'en' } };
  },
  async me() {
    await wait(100);
    const user = currentUser();
    if (!user) throw fail(401, 'Please log in');
    return { user: { points: 0, language: 'en', ...user } };
  },
  async logout() { await wait(100); return null; },

  // ---- Centres and stalls (Siyu)
  // getCentres() -> [{ id, name, address }]
  async getCentres() { await wait(); return clone(CENTRES); },
  // getStalls({ centreId }) -> [stall]   stall = { id, centreId, name, cuisine, unitNo, photoUrl, acceptsCdc, isOpen, ordersAhead, estimatedMinutes }
  async getStalls({ centreId } = {}) {
    await wait();
    return STALLS.filter((s) => !centreId || s.centreId === Number(centreId)).map(toStall);
  },
  async getStall(stallId) {
    await wait();
    const s = stall(stallId);
    if (!s) throw fail(404, 'Stall not found');
    return toStall(s);
  },
  // getMenu(stallId) -> [menuItem]   menuItem = { id, stallId, name, description, priceCents, category, prepMinutes, isAvailable, photoUrl, topPhotoId, topPhotoVotes }
  async getMenu(stallId) {
    await wait();
    if (!stall(stallId)) throw fail(404, 'Stall not found');
    return ITEMS.filter((i) => i.stallId === Number(stallId)).map(toMenuItem);
  },
  // getDish(itemId) -> menuItem + { stall: { id, name, unitNo, isOpen, estimatedMinutes } }
  async getDish(itemId) {
    await wait();
    const i = item(itemId);
    if (!i) throw fail(404, 'Dish not found');
    const s = toStall(stall(i.stallId));
    return { ...toMenuItem(i), stall: { id: s.id, name: s.name, unitNo: s.unitNo, isOpen: s.isOpen, estimatedMinutes: s.estimatedMinutes } };
  },
  // getTopDishes(centreId) -> [{ itemId, name, stallId, stallName, priceCents, photoUrl, votes }]  (most votes first)
  async getTopDishes(centreId) {
    await wait();
    return ITEMS
      .filter((i) => stall(i.stallId).centreId === Number(centreId || 1))
      .map((i) => ({ i, top: topPhoto(i.id) }))
      .filter((x) => x.top)
      .sort((a, b) => b.top.votes - a.top.votes)
      .slice(0, 6)
      .map(({ i, top }) => ({ itemId: i.id, name: i.name, stallId: i.stallId, stallName: stall(i.stallId).name, priceCents: i.priceCents, photoUrl: top.url, votes: top.votes }));
  },
  // search(q, centreId) -> { stalls: [stall], dishes: [{ itemId, name, stallId, stallName, priceCents, photoUrl }] }
  async search(q, centreId) {
    await wait(200);
    const term = String(q || '').trim().toLowerCase();
    const inCentre = (s) => !centreId || s.centreId === Number(centreId);
    const stalls = STALLS.filter((s) => inCentre(s) && `${s.name} ${s.cuisine}`.toLowerCase().includes(term)).map(toStall);
    const dishes = ITEMS
      .filter((i) => inCentre(stall(i.stallId)) && `${i.name} ${i.description || ''}`.toLowerCase().includes(term))
      .map((i) => ({ itemId: i.id, name: i.name, stallId: i.stallId, stallName: stall(i.stallId).name, priceCents: i.priceCents, photoUrl: toMenuItem(i).photoUrl }));
    return { stalls, dishes };
  },

  // ---- Photos (Dana) and votes (Siyu)
  // getPhotos(itemId) -> [{ id, url, votes, votedByMe, isMine, uploadedBy, createdAt }]  (most votes first, earliest wins ties)
  async getPhotos(itemId) {
    await wait();
    const me = currentUser();
    const d = load();
    return d.photos
      .filter((p) => p.itemId === Number(itemId))
      .sort((a, b) => b.votes - a.votes || a.createdAt.localeCompare(b.createdAt))
      .map((p) => ({
        id: p.id, url: p.url, votes: p.votes, uploadedBy: p.uploadedBy, createdAt: p.createdAt,
        votedByMe: Boolean(me && d.votes[`${me.id}:${p.id}`]), isMine: Boolean(me && p.userId === me.id),
      }));
  },
  async getTopPhoto(itemId) {
    await wait();
    const top = topPhoto(Number(itemId));
    return { photo: top ? { id: top.id, itemId: top.itemId, url: top.url, votes: top.votes } : null };
  },
  // vote(photoId) -> { voted: true, votes }   409 if already voted
  async vote(photoId) {
    await wait(150);
    const me = requireUser();
    const d = load();
    const p = d.photos.find((x) => x.id === Number(photoId));
    if (!p) throw fail(404, 'Photo not found');
    const key = `${me.id}:${p.id}`;
    if (d.votes[key]) throw fail(409, 'You already voted for this photo');
    d.votes[key] = true;
    p.votes += 1;
    save();
    return { voted: true, votes: p.votes };
  },
  // unvote(photoId) -> { voted: false, votes }
  async unvote(photoId) {
    await wait(150);
    const me = requireUser();
    const d = load();
    const p = d.photos.find((x) => x.id === Number(photoId));
    if (!p) throw fail(404, 'Photo not found');
    const key = `${me.id}:${p.id}`;
    if (d.votes[key]) { delete d.votes[key]; p.votes -= 1; save(); }
    return { voted: false, votes: p.votes };
  },
  // uploadPhoto(itemId, formData with "photo") -> { photo: { id, itemId, url, status } }   422 if not food
  // Fake AI check: a file whose name contains "notfood" is rejected.
  async uploadPhoto(itemId, formData) {
    await wait(1200);
    const me = requireUser();
    const file = formData.get('photo');
    if (!file) throw fail(400, 'Choose a JPG, PNG or WebP photo');
    if (/not-?food/i.test(file.name || '')) throw fail(422, "That doesn't look like food. Try a clearer photo of the dish.");
    const d = load();
    const photo = { id: d.nextId.photo++, itemId: Number(itemId), url: URL.createObjectURL(file), userId: me.id, uploadedBy: '@you', votes: 0, createdAt: nowIso() };
    d.photos.push(photo);
    save();
    return { photo: { id: photo.id, itemId: photo.itemId, url: photo.url, status: 'approved', createdAt: photo.createdAt } };
  },
  // deletePhoto(photoId) -> null   only your own photo (403 otherwise)
  async deletePhoto(photoId) {
    await wait();
    const me = requireUser();
    const d = load();
    const p = d.photos.find((x) => x.id === Number(photoId));
    if (!p) throw fail(404, 'Photo not found');
    if (p.userId !== me.id) throw fail(403, 'You can only delete your own photos');
    d.photos = d.photos.filter((x) => x.id !== p.id);
    save();
    return null;
  },

  // ---- Ordering (Lennox)
  // getCollectionPoints(centreId) -> [{ id, name, note }]
  async getCollectionPoints(centreId) {
    await wait();
    return POINTS.filter((p) => p.centreId === Number(centreId || 1)).map(({ id, name, note }) => ({ id, name, note }));
  },
  // getPickupSlots(centreId, stallIds) -> { asapMinutes, cutoffMinutes, slots: [{ time, available }] }
  async getPickupSlots(centreId, stallIds = []) {
    await wait();
    const asapMinutes = Math.max(5, ...stallIds.map((id) => (stall(id) ? waitMinutes(stall(id)) : 5)));
    const first = new Date(Date.now() + (asapMinutes + 10) * 60000);
    first.setMinutes(Math.ceil(first.getMinutes() / 15) * 15, 0, 0);
    const slots = Array.from({ length: 9 }, (_, i) => ({
      time: new Date(first.getTime() + i * 15 * 60000).toISOString(),
      available: i !== 2 && i !== 5, // pretend these two slots are full
    }));
    return { asapMinutes, cutoffMinutes: 10, slots };
  },
  // placeOrder({ centreId, collectionPointId, asap, pickupTime, items: [{ itemId, quantity, notes }] })
  //   -> { id, orderNo, totalCents, status: 'pending_payment' }    prices come from the server, never the browser
  async placeOrder(order) {
    await wait(600);
    const me = requireUser();
    const d = load();
    if (!order?.items?.length) throw fail(400, 'Your cart is empty');
    if (!point(order.collectionPointId)) throw fail(400, 'Choose a collection point');
    const byStall = new Map();
    for (const line of order.items) {
      const i = item(line.itemId);
      if (!i) throw fail(400, 'One of the dishes no longer exists');
      if (d.soldOut[i.id]) throw fail(409, `${i.name} just sold out. Remove it to continue.`);
      if (!stall(i.stallId).isOpen) throw fail(409, `${stall(i.stallId).name} is closed right now`);
      if (!byStall.has(i.stallId)) byStall.set(i.stallId, []);
      byStall.get(i.stallId).push({ itemId: i.id, quantity: Math.max(1, Math.min(20, line.quantity)), notes: line.notes || null, unitPriceCents: i.priceCents });
    }
    const id = d.nextId.order++;
    const stalls = [...byStall.entries()].map(([stallId, items]) => ({ id: d.nextId.stallOrder++, stallId, status: 'paid', manual: false, estimatedReadyAt: null, items }));
    const totalCents = stalls.reduce((sum, s) => sum + s.items.reduce((a, l) => a + l.unitPriceCents * l.quantity, 0), 0);
    const asapMins = Math.max(...stalls.map((s) => waitMinutes(stall(s.stallId))));
    const o = {
      id, orderNo: `HK${1000 + id}`, userId: me.id, customerName: me.displayName || 'Customer',
      centreId: Number(order.centreId || 1), collectionPointId: Number(order.collectionPointId),
      asap: Boolean(order.asap), pickupTime: order.asap ? addMinutes(nowIso(), asapMins) : order.pickupTime,
      status: 'pending_payment', totalCents, createdAt: nowIso(), paidAt: null, collectedAt: null, payment: null, stalls,
    };
    d.orders.push(o);
    save();
    return { id: o.id, orderNo: o.orderNo, totalCents, status: o.status };
  },
  // cancelOrder(orderId) -> { status: 'cancelled' }   only before payment
  async cancelOrder(orderId) {
    await wait();
    const o = findOrder(orderId, requireUser());
    if (o.status !== 'pending_payment') throw fail(409, 'This order has already been paid');
    o.status = 'cancelled';
    save();
    return { status: 'cancelled' };
  },
  // myOrders() -> [{ id, orderNo, status, totalCents, createdAt, pickupTime, asap, stalls: [{ name, items: [{ itemId, name, quantity, notes, unitPriceCents }] }] }]
  async myOrders() {
    await wait();
    const me = requireUser();
    const d = load();
    d.orders.forEach(autoProgress);
    save();
    return d.orders
      .filter((o) => o.userId === me.id && o.status !== 'cancelled')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((o) => {
        const r = toReceipt(o);
        return { id: r.id, orderNo: r.orderNo, status: r.status, totalCents: r.totalCents, createdAt: r.createdAt, pickupTime: r.pickupTime, asap: r.asap, stalls: r.stalls.map((s) => ({ stallId: s.stallId, name: s.name, items: s.items })) };
      });
  },
  // getOrder(orderId) -> receipt: tracking shape + { centreName, payment: { method, status, ref, paidAt }, stalls[].subtotalCents, items[].unitPriceCents }
  async getOrder(orderId) {
    await wait();
    const o = findOrder(orderId, requireUser());
    autoProgress(o);
    save();
    return toReceipt(o);
  },

  // ---- Payment (Declan)
  // createNetsQr(orderId) -> { qrData, qrImage?, amountCents, expiresAt, ref }   (call again to retry after a failure)
  async createNetsQr(orderId) {
    await wait(500);
    const o = findOrder(orderId, requireUser());
    if (o.status !== 'pending_payment') throw fail(409, 'This order has already been paid');
    o.payment = { status: 'pending', ref: `NETS-${Math.floor(100000 + Math.random() * 899999)}`, createdAt: nowIso(), expiresAt: addMinutes(nowIso(), 5), autoPayAt: Date.now() + 10000, forced: null };
    save();
    return { qrData: `NETSQR|${o.orderNo}|${o.totalCents}|${o.payment.ref}`, amountCents: o.totalCents, expiresAt: o.payment.expiresAt, ref: o.payment.ref };
  },
  // paymentStatus(orderId) -> { status: 'pending' | 'success' | 'failed' | 'timeout' }
  // Fake mode: pays itself after ~10 seconds (or use the test buttons on the payment page).
  async paymentStatus(orderId) {
    await wait(150);
    const o = findOrder(orderId, requireUser());
    const p = o.payment;
    if (!p) return { status: 'pending' };
    if (p.status === 'pending') {
      if (p.forced === 'failed') p.status = 'failed';
      else if (p.forced === 'success' || Date.now() >= p.autoPayAt) markPaid(o);
      else if (Date.now() > new Date(p.expiresAt).getTime()) p.status = 'timeout';
      save();
    }
    return { status: p.status };
  },

  // ---- Customer tracking (Zi Ying)
  async trackOrder(orderId) {
    await wait(150);
    const o = findOrder(orderId, requireUser());
    autoProgress(o);
    save();
    return toTracking(o);
  },

  // ---- Hawker side (Zi Ying)
  async hawkerOrders() {
    await wait(200);
    const me = requireUser();
    const d = load();
    const myStalls = Object.entries(d.stallOwners).filter(([, owner]) => owner === me.id).map(([id]) => Number(id));
    const next = { paid: 'preparing', preparing: 'ready', ready: 'collected' };
    const cards = [];
    for (const o of d.orders) {
      if (!['paid', 'preparing', 'ready'].includes(o.status)) continue;
      for (const part of o.stalls) {
        if (!myStalls.includes(part.stallId) || part.status === 'collected') continue;
        const cp = point(o.collectionPointId);
        cards.push({
          id: part.id, stallId: part.stallId, status: part.status, nextStatus: next[part.status] || null,
          estimatedReadyAt: part.estimatedReadyAt,
          subtotalCents: part.items.reduce((a, l) => a + l.unitPriceCents * l.quantity, 0),
          order: { id: o.id, orderNo: o.orderNo, pickupTime: o.pickupTime, asap: o.asap, createdAt: o.createdAt, customerName: o.customerName, collectionPoint: cp?.name || null, stallCount: o.stalls.length },
          items: part.items.map((l, i) => ({ id: `${part.id}-${i}`, name: item(l.itemId).name, quantity: l.quantity, notes: l.notes })),
        });
      }
    }
    cards.sort((a, b) => new Date(a.order.asap ? a.order.createdAt : a.order.pickupTime) - new Date(b.order.asap ? b.order.createdAt : b.order.pickupTime));
    return { stalls: myStalls.map((id) => ({ id, name: stall(id).name, unitNo: stall(id).unitNo, isPaused: false })), orders: cards };
  },
  async updateStallOrderStatus(stallOrderId, status) {
    await wait(200);
    requireUser();
    const d = load();
    const next = { paid: 'preparing', preparing: 'ready', ready: 'collected' };
    for (const o of d.orders) {
      const part = o.stalls.find((p) => p.id === Number(stallOrderId));
      if (!part) continue;
      if (next[part.status] !== status) throw fail(409, `Can’t change this order from ${part.status} to ${status}`);
      part.status = status;
      part.manual = true;
      o.status = orderStatusFrom(o.stalls);
      if (o.status === 'collected') o.collectedAt = nowIso();
      save();
      return { id: part.id, status: part.status, nextStatus: next[part.status] || null, orderStatus: o.status };
    }
    throw fail(404, 'Order not found');
  },
  // hawkerMenu() -> [{ id, name, priceCents, category, isAvailable }]   dishes of my stall(s)
  async hawkerMenu() {
    await wait();
    const me = requireUser();
    const d = load();
    const myStalls = Object.entries(d.stallOwners).filter(([, owner]) => owner === me.id).map(([id]) => Number(id));
    return ITEMS.filter((i) => myStalls.includes(i.stallId)).map((i) => ({ id: i.id, name: i.name, priceCents: i.priceCents, category: i.category, isAvailable: !d.soldOut[i.id] }));
  },
  // setItemSoldOut(itemId, isSoldOut) -> { id, isAvailable }
  async setItemSoldOut(itemId, isSoldOut) {
    await wait(200);
    requireUser();
    const d = load();
    if (isSoldOut) d.soldOut[itemId] = true; else delete d.soldOut[itemId];
    save();
    return { id: Number(itemId), isAvailable: !isSoldOut };
  },
};

function markPaid(o) {
  const t = nowIso();
  o.payment.status = 'success';
  o.payment.paidAt = t;
  o.status = 'paid';
  o.paidAt = t;
  o.stalls.forEach((part) => {
    part.status = 'paid';
    part.estimatedReadyAt = addMinutes(t, waitMinutes(stall(part.stallId)));
  });
  // Multi-stall sync (FSDP-66): everyone aims for the slowest stall's time, or the pick-up time
  const latest = o.stalls.map((p) => p.estimatedReadyAt).sort().pop();
  const target = o.asap ? latest : (o.pickupTime > latest ? o.pickupTime : latest);
  o.stalls.forEach((part) => { part.estimatedReadyAt = target; });
}

// Test helpers for the browser console or the payment page's test buttons (fake mode only)
export const mockTools = {
  reset() { db = seed(); save(); },
  forcePayment(orderId, outcome) {
    const o = load().orders.find((x) => x.id === Number(orderId));
    if (o?.payment) { o.payment.forced = outcome; save(); }
  },
};
