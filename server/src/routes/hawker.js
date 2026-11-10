// Owner: Zi Ying – live orders and hawker side
// Mounted at /api/hawker. Every route here is hawker-only.
const express = require('express');
const { supabase } = require('../supabase');
const { requireAuth, requireRole } = require('../middleware/auth');
const { notBuilt } = require('../notBuilt');

const router = express.Router();
router.use(requireAuth, requireRole('hawker'));

// A stall's share of an order moves through these steps, one at a time
const NEXT_STATUS = { paid: 'preparing', preparing: 'ready', ready: 'collected' };
const ACTIVE_STATUSES = ['paid', 'preparing', 'ready'];
// Orders still waiting for payment, or cancelled, never reach the hawker
const VISIBLE_ORDER_STATUSES = ['paid', 'preparing', 'ready', 'collected'];

// The stalls this hawker owns (usually one)
async function getMyStalls(userId) {
  const { data, error } = await supabase
    .from('stalls')
    .select('id, name, unit_no, is_paused')
    .eq('owner_id', userId)
    .order('id');
  if (error) throw error;
  return data;
}

// After one stall updates its part, work out the whole order's status:
// collected = every stall handed over; ready = every stall ready (or handed over);
// preparing = any stall has started; otherwise still just paid.
async function syncOrderStatus(orderId) {
  const { data, error } = await supabase.from('stall_orders').select('status').eq('order_id', orderId);
  if (error) throw error;

  const parts = data.map((row) => row.status);
  let status = 'paid';
  if (parts.every((s) => s === 'collected')) status = 'collected';
  else if (parts.every((s) => s === 'ready' || s === 'collected')) status = 'ready';
  else if (parts.some((s) => s !== 'paid')) status = 'preparing';

  const patch = { status };
  if (status === 'collected') patch.collected_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', orderId)
    .in('status', ACTIVE_STATUSES); // never touch unpaid, cancelled or already-collected orders
  if (updateError) throw updateError;
  return status;
}

function toCard(row) {
  const order = row.orders;
  return {
    id: row.id, // the stall_order id – use this to update status
    stallId: row.stall_id,
    status: row.status,
    nextStatus: NEXT_STATUS[row.status] || null,
    estimatedReadyAt: row.estimated_ready_at,
    subtotalCents: row.subtotal_cents,
    order: {
      id: order.id,
      orderNo: order.order_no,
      pickupTime: order.pickup_time,
      asap: order.asap,
      createdAt: order.created_at,
      customerName: order.users?.display_name || 'Customer',
      collectionPoint: order.collection_points?.name || null,
    },
    items: (row.order_items || []).map((item) => ({
      id: item.id,
      name: item.menu_items?.name || 'Item',
      quantity: item.quantity,
      notes: item.notes,
    })),
  };
}

// The time the hawker should aim for: the pick-up time, or when an ASAP order came in
function dueTime(card) {
  return new Date(card.order.asap ? card.order.createdAt : card.order.pickupTime).getTime();
}

// GET /api/hawker/orders   (FSDP-50)
// Paid orders for my stall(s), soonest pick-up first.
// Add ?include=collected to also see orders already handed over.
router.get('/orders', async (req, res, next) => {
  try {
    const stalls = await getMyStalls(req.user.userId);
    if (stalls.length === 0) return res.json({ stalls: [], orders: [] });

    const statuses = req.query.include === 'collected' ? [...ACTIVE_STATUSES, 'collected'] : ACTIVE_STATUSES;

    const { data, error } = await supabase
      .from('stall_orders')
      .select(`
        id, stall_id, status, estimated_ready_at, subtotal_cents,
        orders!inner ( id, order_no, pickup_time, asap, status, created_at,
                       users ( display_name ), collection_points ( name ) ),
        order_items ( id, quantity, notes, menu_items ( name ) )
      `)
      .in('stall_id', stalls.map((s) => s.id))
      .in('status', statuses)
      .in('orders.status', VISIBLE_ORDER_STATUSES)
      .limit(200);
    if (error) throw error;

    const orders = data.map(toCard).sort((a, b) => dueTime(a) - dueTime(b));
    res.json({
      stalls: stalls.map((s) => ({ id: s.id, name: s.name, unitNo: s.unit_no, isPaused: s.is_paused })),
      orders,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/hawker/orders/:stallOrderId/status   (FSDP-51)
// Body: { status: 'preparing' | 'ready' | 'collected' } – must be the next step.
router.patch('/orders/:stallOrderId/status', async (req, res, next) => {
  try {
    const stallOrderId = Number(req.params.stallOrderId);
    if (!Number.isInteger(stallOrderId) || stallOrderId < 1) {
      return res.status(400).json({ error: 'Invalid order' });
    }
    const { status } = req.body;
    if (!['preparing', 'ready', 'collected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be preparing, ready or collected' });
    }

    const stalls = await getMyStalls(req.user.userId);
    const myStallIds = stalls.map((s) => s.id);

    const { data: current, error } = await supabase
      .from('stall_orders')
      .select('id, status, stall_id, order_id, orders ( status )')
      .eq('id', stallOrderId)
      .maybeSingle();
    if (error) throw error;

    // Same message for "doesn't exist" and "not your stall", so hawkers can't probe other stalls
    if (!current || !myStallIds.includes(current.stall_id)) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (!VISIBLE_ORDER_STATUSES.includes(current.orders?.status)) {
      return res.status(409).json({ error: 'This order hasn’t been paid' });
    }
    if (NEXT_STATUS[current.status] !== status) {
      return res.status(409).json({ error: `Can’t change this order from ${current.status} to ${status}` });
    }

    // Only update if nobody else changed it since we read it (e.g. two devices at the stall)
    const { data: updated, error: updateError } = await supabase
      .from('stall_orders')
      .update({ status })
      .eq('id', stallOrderId)
      .eq('status', current.status)
      .select('id, status')
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) {
      return res.status(409).json({ error: 'This order was just updated. Refresh and try again.' });
    }

    const orderStatus = await syncOrderStatus(current.order_id);
    res.json({ id: updated.id, status: updated.status, nextStatus: NEXT_STATUS[updated.status] || null, orderStatus });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/hawker/menu-items/:itemId/sold-out   body: { isSoldOut }  (FSDP-53, Sprint 2)
router.patch('/menu-items/:itemId/sold-out', notBuilt('FSDP-53'));

module.exports = router;