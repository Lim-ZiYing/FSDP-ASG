// Owner: Zi Ying – live order tracking for customers (FSDP-48)
// Mounted at /api/track. A customer can only see their own orders.
const express = require('express');
const { supabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/track/:orderId   the order's overall status plus each stall's progress
router.get('/:orderId', async (req, res, next) => {
  try {
    const orderId = Number(req.params.orderId);
    if (!Number.isInteger(orderId) || orderId < 1) {
      return res.status(400).json({ error: 'Invalid order' });
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id, order_no, user_id, status, pickup_time, asap, total_cents, created_at, collected_at,
        collection_points ( name, note ),
        stall_orders ( id, status, estimated_ready_at,
                       stalls ( name, unit_no ),
                       order_items ( quantity, notes, menu_items ( name ) ) )
      `)
      .eq('id', orderId)
      .maybeSingle();
    if (error) throw error;

    // Same message for "doesn't exist" and "someone else's order"
    if (!order || order.user_id !== req.user.userId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      id: order.id,
      orderNo: order.order_no,
      status: order.status,
      pickupTime: order.pickup_time,
      asap: order.asap,
      totalCents: order.total_cents,
      createdAt: order.created_at,
      collectedAt: order.collected_at,
      collectionPoint: order.collection_points
        ? { name: order.collection_points.name, note: order.collection_points.note }
        : null,
      stalls: (order.stall_orders || [])
        .sort((a, b) => a.id - b.id)
        .map((so) => ({
          id: so.id,
          name: so.stalls?.name || 'Stall',
          unitNo: so.stalls?.unit_no || null,
          status: so.status,
          estimatedReadyAt: so.estimated_ready_at,
          items: (so.order_items || []).map((item) => ({
            name: item.menu_items?.name || 'Item',
            quantity: item.quantity,
            notes: item.notes,
          })),
        })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;