// Owner: Declan – NETS QR payment
// Mounted at /api/payments. The NETS API calls themselves live in services/nets.js.
//
// Flow: createNetsQr asks NETS for a QR and saves a 'pending' payments row, then this server listens
// to NETS's event stream for that QR. When NETS says it was scanned, the payment and order become paid.
// paymentStatus (polled by the page every 3 s) only reads our own database, so it never hits NETS.
const express = require('express');
const { supabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const nets = require('../services/nets');

const router = express.Router();

const QR_LIFETIME_MS = 5 * 60 * 1000; // NETS QR codes last 5 minutes (same as the coursework timer)

const listeners = new Map(); // paymentId -> { close }   live NETS streams (in memory)
const qrCache = new Map();   // orderId -> { expiresAt, response }   so a page refresh reuses the same QR
const inflight = new Map();  // orderId -> Promise   stops two simultaneous requests creating two QRs

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const wrap = (fn) => async (req, res) => {
  try {
    res.json(await fn(req));
  } catch (err) {
    if (!err.status) console.error('payments error:', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Something went wrong with the payment' });
  }
};

async function loadOrder(orderId, userId) {
  const id = Number(orderId);
  if (!Number.isInteger(id)) throw httpError(404, 'Order not found');
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, total_cents, asap, pickup_time')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw httpError(404, 'Order not found');
  return data;
}

// ---------- Marking things paid ----------

// Order -> paid, and work out when each stall will be ready (same rule as the mock's markPaid).
async function markOrderPaid(orderId) {
  const { data: order, error } = await supabase
    .from('orders').select('id, status, asap, pickup_time').eq('id', orderId).single();
  if (error) throw error;
  if (order.status !== 'pending_payment') return;

  const { error: upErr } = await supabase
    .from('orders').update({ status: 'paid' }).eq('id', orderId).eq('status', 'pending_payment');
  if (upErr) throw upErr;

  const { data: parts } = await supabase.from('stall_orders').select('id, stall_id').eq('order_id', orderId);
  if (!parts?.length) return;
  const stallIds = [...new Set(parts.map((p) => p.stall_id))];

  const { data: stalls } = await supabase.from('stalls').select('id, avg_prep_minutes').in('id', stallIds);
  // Other PAID orders still being made at those stalls (unpaid orders don't count)
  const { data: ahead } = await supabase
    .from('stall_orders')
    .select('stall_id, orders!inner(status)')
    .in('stall_id', stallIds)
    .in('status', ['paid', 'preparing'])
    .in('orders.status', ['paid', 'preparing'])
    .neq('order_id', orderId);

  const aheadCount = {};
  (ahead || []).forEach((r) => { aheadCount[r.stall_id] = (aheadCount[r.stall_id] || 0) + 1; });
  const waitMins = (stallId) => {
    const s = stalls.find((x) => x.id === stallId);
    return Math.max(3, (s?.avg_prep_minutes ?? 8) + (aheadCount[stallId] || 0) * 3);
  };

  // Everyone aims for the slowest stall's time, or the pick-up time if that is later (FSDP-66)
  const now = Date.now();
  const latest = Math.max(...parts.map((p) => now + waitMins(p.stall_id) * 60000));
  const target = order.asap ? latest : Math.max(latest, new Date(order.pickup_time).getTime());
  await supabase
    .from('stall_orders').update({ estimated_ready_at: new Date(target).toISOString() }).eq('order_id', orderId);
}

function stopListener(paymentId) {
  listeners.get(paymentId)?.close();
  listeners.delete(paymentId);
}

async function settlePaid(payment) {
  stopListener(payment.id);
  qrCache.delete(payment.order_id);
  // Only the first caller flips pending -> success, so this is safe to call twice
  const { data: changed } = await supabase
    .from('payments')
    .update({ status: 'success', paid_at: new Date().toISOString() })
    .eq('id', payment.id).eq('status', 'pending').select('id');
  if (!changed?.length) return;
  await markOrderPaid(payment.order_id);
}

// The QR has run out: ask NETS for the final answer once. Paid -> success, otherwise -> timeout.
async function resolveAtTimeout(payment) {
  stopListener(payment.id);
  qrCache.delete(payment.order_id);
  let paid = false;
  try {
    const r = await nets.queryQr(payment.nets_txn_ref, true);
    paid = r.response_code === '00' && r.txn_status === 1;
  } catch (err) {
    console.error('NETS query failed:', err.message);
  }
  if (paid) return settlePaid(payment);
  await supabase.from('payments').update({ status: 'timeout' }).eq('id', payment.id).eq('status', 'pending');
}

function startListener(payment) {
  stopListener(payment.id);
  const handle = nets.listenForScan(payment.nets_txn_ref, {
    onMessage: async (msg) => {
      try {
        if (msg.message === 'QR code scanned' && msg.response_code === '00') await settlePaid(payment);
        else if (msg.message === 'Timeout') await resolveAtTimeout(payment);
      } catch (err) {
        console.error('NETS message handling failed:', err);
      }
    },
    onEnd: () => { if (listeners.get(payment.id) === handle) listeners.delete(payment.id); },
  });
  listeners.set(payment.id, handle);
}

// ---------- Routes ----------

async function createQr(order) {
  // Close out any earlier attempts for this order (also catches a payment that slipped in late)
  const { data: old } = await supabase
    .from('payments').select('*').eq('order_id', order.id).eq('status', 'pending');
  for (const p of old || []) await resolveAtTimeout(p);

  const d = await nets.requestQr((order.total_cents / 100).toFixed(2));
  if (d.response_code !== '00' || d.txn_status !== 1 || !d.qr_code) {
    console.error('NETS refused the QR request:', d);
    throw httpError(502, d.instruction || 'NETS could not create a QR code. Please try again.');
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({ order_id: order.id, amount_cents: order.total_cents, nets_txn_ref: d.txn_retrieval_ref, status: 'pending' })
    .select().single();
  if (error) throw error;

  startListener(payment);

  const expiresAt = new Date(new Date(payment.created_at).getTime() + QR_LIFETIME_MS).toISOString();
  const response = {
    qrData: d.txn_retrieval_ref,
    qrImage: `data:image/png;base64,${d.qr_code}`,
    amountCents: order.total_cents,
    expiresAt,
    ref: d.txn_retrieval_ref,
  };
  qrCache.set(order.id, { expiresAt: new Date(expiresAt).getTime(), response });
  return response;
}

// POST /api/payments/:orderId/nets-qr     create a NETS QR for this order (FSDP-16)
router.post('/:orderId/nets-qr', requireAuth, wrap(async (req) => {
  const order = await loadOrder(req.params.orderId, req.user.userId);
  if (order.status === 'cancelled') throw httpError(409, 'This order was cancelled');
  if (order.status !== 'pending_payment') throw httpError(409, 'This order has already been paid');

  const cached = qrCache.get(order.id);
  if (cached && cached.expiresAt > Date.now()) return cached.response;

  if (!inflight.has(order.id)) {
    const p = createQr(order).finally(() => inflight.delete(order.id));
    inflight.set(order.id, p);
  }
  return inflight.get(order.id);
}));

// GET  /api/payments/:orderId/status      has this order been paid? (FSDP-17)
router.get('/:orderId/status', requireAuth, wrap(async (req) => {
  const order = await loadOrder(req.params.orderId, req.user.userId);

  const { data: payment, error } = await supabase
    .from('payments').select('*').eq('order_id', order.id).order('id', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!payment) return { status: 'pending' };

  if (payment.status === 'success') {
    if (order.status === 'pending_payment') await markOrderPaid(order.id); // finish a half-done update
    return { status: 'success' };
  }
  if (payment.status !== 'pending') return { status: payment.status };

  const expired = Date.now() >= new Date(payment.created_at).getTime() + QR_LIFETIME_MS;
  if (expired) {
    await resolveAtTimeout(payment);
    const { data: fresh } = await supabase.from('payments').select('status').eq('id', payment.id).single();
    return { status: fresh.status };
  }
  if (!listeners.has(payment.id)) startListener(payment); // server restarted, or the stream dropped
  return { status: 'pending' };
}));

// Sprint 2: retry a failed or timed-out payment (FSDP-44) – calling nets-qr again already does this.
// There is no POST /nets/notify: the NETS sandbox doesn't call us, we listen to its event stream instead.

module.exports = router;