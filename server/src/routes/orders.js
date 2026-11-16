// Owner: Lennox – cart, ordering, pre-order and order history
// Mounted at /api/orders. Each route must return the SAME shape as its function in client/src/mocks.js.
// When yours works, delete its name from NOT_READY in client/src/api.js.
// Agree the orders / stall_orders columns and status names with Declan and Zi Ying before building.
const express = require("express");
const { supabase } = require("../supabase");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// Turns a database row into the shape the pages expect
function shapeOrder(o) {
  const pay = (o.payments || [])[0];
  return {
    id: o.id,
    orderNo: o.order_no,
    status: o.status,
    asap: o.asap,
    pickupTime: o.pickup_time,
    createdAt: o.created_at,
    totalCents: o.total_cents,
    centreName: o.hawker_centres?.name || null,
    collectionPoint: o.collection_points
      ? { name: o.collection_points.name, note: o.collection_points.note }
      : null,
    payment: pay
      ? {
          method: "NETS QR",
          status: pay.status,
          ref: pay.nets_txn_ref,
          paidAt: pay.paid_at,
        }
      : null,
    stalls: (o.stall_orders || []).map((so) => ({
      id: so.id,
      stallId: so.stall_id,
      name: so.stalls?.name,
      status: so.status,
      estimatedReadyAt: so.estimated_ready_at,
      subtotalCents: so.subtotal_cents,
      items: (so.order_items || []).map((i) => ({
        id: i.id,
        itemId: i.item_id,
        name: i.menu_items?.name,
        quantity: i.quantity,
        unitPriceCents: i.unit_price_cents,
        notes: i.notes,
        photoUrl: so.stalls?.default_photo_url || null,
      })),
    })),
  };
}

// Ask the database for an order plus everything inside it, in one go
const ORDER_SELECT = `
  id, order_no, status, asap, pickup_time, created_at, total_cents,
  hawker_centres ( name ),
  collection_points ( name, note ),
  payments ( status, nets_txn_ref, paid_at ),
  stall_orders (
    id, stall_id, status, estimated_ready_at, subtotal_cents,
    stalls ( name, default_photo_url ),
    order_items ( id, item_id, quantity, unit_price_cents, notes,
                  menu_items ( name ) )
  )
`;

// How many minutes until a stall can start on a new order (simple guess:
// 4 minutes for every order it is still cooking, minimum 5)
async function asapMinutesFor(stallIds) {
  const { data } = await supabase
    .from("stall_orders")
    .select("stall_id")
    .in("stall_id", stallIds)
    .in("status", ["paid", "preparing"]);
  const counts = {};
  (data || []).forEach((r) => {
    counts[r.stall_id] = (counts[r.stall_id] || 0) + 1;
  });
  return Math.max(5, ...stallIds.map((id) => 5 + 4 * (counts[id] || 0)));
}

// GET  /api/orders/pickup-slots?centreId=1&stallIds=1,2   pick-up times (FSDP-29, FSDP-33)   → mocks.js getPickupSlots
//      returns { asapMinutes, cutoffMinutes, slots: [{ time, available }] }
//      Keep this ABOVE '/:id', or Express will treat "pickup-slots" as an order id.
router.get("/pickup-slots", async (req, res) => {
  const stallIds = String(req.query.stallIds || "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  if (stallIds.length === 0)
    return res.status(400).json({ error: "No stalls given" });

  const asapMinutes = await asapMinutesFor(stallIds);
  const first = new Date(Date.now() + (asapMinutes + 10) * 60000);
  first.setMinutes(Math.ceil(first.getMinutes() / 15) * 15, 0, 0);
  const slots = Array.from({ length: 9 }, (_, i) => ({
    time: new Date(first.getTime() + i * 15 * 60000).toISOString(),
    available: true,
  }));
  res.json({ asapMinutes, cutoffMinutes: 10, slots });
});

// POST /api/orders                 turn the cart into an order (FSDP-14, multi-stall FSDP-65)   → mocks.js placeOrder
//      body: { centreId, collectionPointId, asap, pickupTime, items: [{ itemId, quantity, notes }] }
//      returns { id, orderNo, totalCents, status: 'pending_payment' }
//      Read prices from the database – never trust prices sent by the browser.
router.post("/", async (req, res) => {
  const { items, collectionPointId, pickupTime, asap, centreId } = req.body;

  // 1. Basic checks
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Your cart is empty" });
  }
  if (!collectionPointId)
    return res.status(400).json({ error: "Choose a collection point" });
  for (const i of items) {
    if (
      !Number.isInteger(i.itemId) ||
      !Number.isInteger(i.quantity) ||
      i.quantity < 1
    ) {
      return res.status(400).json({ error: "Invalid item or quantity" });
    }
  }
  if (!asap) {
    const t = new Date(pickupTime);
    if (isNaN(t.getTime()) || t.getTime() < Date.now()) {
      return res
        .status(400)
        .json({ error: "Choose a pick-up time in the future" });
    }
  }

  // 2. Look up the REAL dishes and prices from the database
  const ids = [...new Set(items.map((i) => i.itemId))];
  const { data: menu, error: menuErr } = await supabase
    .from("menu_items")
    .select(
      "id, name, stall_id, price_cents, is_available, stalls ( name, is_open, centre_id )",
    )
    .in("id", ids);
  if (menuErr) return res.status(500).json({ error: menuErr.message });
  if (menu.length !== ids.length) {
    return res
      .status(400)
      .json({ error: "One of the dishes no longer exists" });
  }
  const menuById = Object.fromEntries(menu.map((m) => [m.id, m]));

  // 3. Group the dishes by stall and add up the money
  const byStall = {};
  for (const i of items) {
    const dish = menuById[i.itemId];
    if (dish.is_available === false) {
      return res
        .status(409)
        .json({ error: `${dish.name} just sold out. Remove it to continue.` });
    }
    if (dish.stalls?.is_open === false) {
      return res
        .status(409)
        .json({ error: `${dish.stalls.name} is closed right now` });
    }
    const qty = Math.max(1, Math.min(20, i.quantity));
    if (!byStall[dish.stall_id])
      byStall[dish.stall_id] = {
        lines: [],
        subtotal: 0,
        centreId: dish.stalls?.centre_id,
      };
    byStall[dish.stall_id].lines.push({
      item_id: dish.id,
      quantity: qty,
      unit_price_cents: dish.price_cents,
      notes: i.notes || null,
    });
    byStall[dish.stall_id].subtotal += dish.price_cents * qty;
  }
  const stallIds = Object.keys(byStall).map(Number);
  const total = stallIds.reduce((sum, id) => sum + byStall[id].subtotal, 0);

  // ASAP = now + the slowest stall's wait. Otherwise the time they chose.
  const pickup = asap
    ? new Date(Date.now() + (await asapMinutesFor(stallIds)) * 60000)
    : new Date(pickupTime);

  // 4a. Save the order
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      user_id: req.user.userId,
      centre_id: Number(centreId) || byStall[stallIds[0]].centreId,
      collection_point_id: Number(collectionPointId),
      pickup_time: pickup.toISOString(),
      asap: !!asap,
      total_cents: total,
    })
    .select()
    .single();
  if (orderErr) return res.status(500).json({ error: orderErr.message });

  // 4b. Save one stall_order per stall
  const { data: stallOrders, error: soErr } = await supabase
    .from("stall_orders")
    .insert(
      stallIds.map((id) => ({
        order_id: order.id,
        stall_id: id,
        subtotal_cents: byStall[id].subtotal,
      })),
    )
    .select();
  if (soErr) {
    await supabase.from("orders").delete().eq("id", order.id); // undo
    return res.status(500).json({ error: soErr.message });
  }

  // 4c. Save the dishes
  const rows = stallOrders.flatMap((so) =>
    byStall[so.stall_id].lines.map((l) => ({ ...l, stall_order_id: so.id })),
  );
  const { error: itemErr } = await supabase.from("order_items").insert(rows);
  if (itemErr) {
    await supabase.from("orders").delete().eq("id", order.id); // undo (stall_orders go too)
    return res.status(500).json({ error: itemErr.message });
  }

  // 5. Tell the browser it worked (same shape as placeOrder in mocks.js)
  res.status(201).json({
    id: order.id,
    orderNo: order.order_no,
    totalCents: total,
    status: order.status,
  });
});

// GET  /api/orders/mine            my orders, newest first (FSDP-18)   → mocks.js myOrders
router.get("/mine", async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("user_id", req.user.userId) // only MY orders
    .neq("status", "cancelled") // history hides cancelled orders
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(shapeOrder));
});

// GET  /api/orders/:id             one order as a receipt (FSDP-43, FSDP-45)   → mocks.js getOrder
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id))
    return res.status(400).json({ error: "Bad order id" });

  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .eq("user_id", req.user.userId) // can't see other people's orders
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Order not found" });
  res.json(shapeOrder(data));
});

// POST /api/orders/:id/cancel      cancel before payment only (FSDP-44)   → mocks.js cancelOrder
//      returns { status: 'cancelled' }   409 if already paid
router.post("/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id))
    return res.status(400).json({ error: "Bad order id" });

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", id)
    .eq("user_id", req.user.userId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.status !== "pending_payment") {
    return res.status(409).json({ error: "This order has already been paid" });
  }

  const { error: upErr } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (upErr) return res.status(500).json({ error: upErr.message });
  res.json({ status: "cancelled" });
});

module.exports = router;
