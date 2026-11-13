// Owner: Lennox – cart, ordering, pre-order and order history
// Mounted at /api/orders. Agree the orders / stall_orders columns and
// status names with Declan and Zi Ying before building.
const express = require("express");
const { supabase } = require("../supabase");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// POST /api/orders                 turn the cart into an order (FSDP-14; multi-stall FSDP-65 in Sprint 2)
//      body: { items: [{ itemId, quantity }], collectionPointId, pickupTime }
//      Read prices from the database – never trust prices sent by the browser.
router.post("/", async (req, res) => {
  const { items, collectionPointId, pickupTime, asap } = req.body;

  // 1. Basic checks
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Your cart is empty" });
  }
  for (const i of items) {
    if (
      !Number.isInteger(i.itemId) ||
      !Number.isInteger(i.quantity) ||
      i.quantity < 1
    ) {
      return res.status(400).json({ error: "Invalid item or quantity" });
    }
  }
  const pickup = asap ? new Date() : new Date(pickupTime);
  if (isNaN(pickup.getTime())) {
    return res.status(400).json({ error: "Invalid pick-up time" });
  }

  // 2. Look up the REAL dishes and prices from the database
  const ids = [...new Set(items.map((i) => i.itemId))];
  const { data: menu, error: menuErr } = await supabase
    .from("menu_items")
    .select("id, stall_id, price_cents")
    .in("id", ids);
  if (menuErr) return res.status(500).json({ error: menuErr.message });
  if (menu.length !== ids.length) {
    return res.status(400).json({ error: "Some dishes no longer exist" });
  }
  const menuById = Object.fromEntries(menu.map((m) => [m.id, m]));

  // 3. Group the dishes by stall and add up the money
  const byStall = {};
  for (const i of items) {
    const dish = menuById[i.itemId];
    if (!byStall[dish.stall_id])
      byStall[dish.stall_id] = { lines: [], subtotal: 0 };
    byStall[dish.stall_id].lines.push({
      item_id: dish.id,
      quantity: i.quantity,
      unit_price_cents: dish.price_cents,
      notes: i.notes || null,
    });
    byStall[dish.stall_id].subtotal += dish.price_cents * i.quantity;
  }
  const stallIds = Object.keys(byStall).map(Number);
  const total = stallIds.reduce((sum, id) => sum + byStall[id].subtotal, 0);

  // Which hawker centre are these stalls in?
  const { data: stalls, error: stallErr } = await supabase
    .from("stalls")
    .select("id, centre_id")
    .in("id", stallIds);
  if (stallErr) return res.status(500).json({ error: stallErr.message });

  // 4a. Save the order
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      user_id: req.user.userId,
      centre_id: stalls[0].centre_id,
      collection_point_id: collectionPointId || null,
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

  // 5. Tell the browser it worked
  res
    .status(201)
    .json({ orderId: order.id, orderNo: order.order_no, totalCents: total });
});

// Turns a database row into the shape the pages expect
function shapeOrder(o) {
  return {
    id: o.id,
    orderNo: o.order_no,
    status: o.status,
    asap: o.asap,
    pickupTime: o.pickup_time,
    createdAt: o.created_at,
    totalCents: o.total_cents,
    collectionPoint: o.collection_points
      ? { name: o.collection_points.name, note: o.collection_points.note }
      : null,
    stalls: (o.stall_orders || []).map((so) => ({
      id: so.id,
      stallId: so.stall_id,
      name: so.stalls?.name,
      status: so.status,
      estimatedReadyAt: so.estimated_ready_at,
      items: (so.order_items || []).map((i) => ({
        id: i.id,
        itemId: i.item_id,
        name: i.menu_items?.name,
        quantity: i.quantity,
        unitPriceCents: i.unit_price_cents,
        notes: i.notes,
        photoUrl: i.menu_items?.photo_url || null,
      })),
    })),
  };
}

// Ask the database for an order plus everything inside it, in one go
const ORDER_SELECT = `
  id, order_no, status, asap, pickup_time, created_at, total_cents,
  collection_points ( name, note ),
  stall_orders (
    id, stall_id, status, estimated_ready_at, subtotal_cents,
    stalls ( name ),
    order_items ( id, item_id, quantity, unit_price_cents, notes,
                  menu_items ( name, photo_url ) )
  )
`;

// GET  /api/orders/mine            my past orders (FSDP-18)
router.get("/mine", async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("user_id", req.user.userId) // only MY orders
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(shapeOrder));
});

// GET  /api/orders/:id             one order with its status (used by OrderConfirmed and TrackOrder)
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

module.exports = router;
