const express = require('express');
const { sql, getPool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/orders
// Body: { pointId, pickupTime (ISO string, or null for ASAP), items: [{ itemId, quantity }], saveAsUsual }
// Items can come from several stalls. Prices are read from the database, never trusted from the client.
router.post('/', requireAuth, async (req, res, next) => {
  const { pointId, pickupTime = null, items, saveAsUsual = false } = req.body;
  if (!Number.isInteger(pointId)) return res.status(400).json({ error: 'Choose a collection point' });
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Your cart is empty' });
  if (items.some((i) => !Number.isInteger(i.itemId) || !Number.isInteger(i.quantity) || i.quantity < 1)) {
    return res.status(400).json({ error: 'Invalid cart items' });
  }

  let transaction;
  try {
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Look up current prices and availability
    const lookup = new sql.Request(transaction);
    const ids = items.map((i, n) => {
      lookup.input(`id${n}`, sql.Int, i.itemId);
      return `@id${n}`;
    });
    const menu = await lookup.query(
      `SELECT ItemId, Price, IsSoldOut FROM MenuItems WHERE ItemId IN (${ids.join(',')})`
    );
    const byId = new Map(menu.recordset.map((m) => [m.ItemId, m]));

    for (const i of items) {
      const m = byId.get(i.itemId);
      if (!m) { await transaction.rollback(); return res.status(400).json({ error: `Item ${i.itemId} not found` }); }
      if (m.IsSoldOut) { await transaction.rollback(); return res.status(409).json({ error: 'An item in your cart has sold out' }); }
    }

    const total = items.reduce((sum, i) => sum + Number(byId.get(i.itemId).Price) * i.quantity, 0);

    const orderResult = await new sql.Request(transaction)
      .input('userId', sql.Int, req.user.userId)
      .input('pointId', sql.Int, pointId)
      .input('pickupTime', sql.DateTime2, pickupTime ? new Date(pickupTime) : null)
      .input('total', sql.Decimal(8, 2), total)
      .input('isUsual', sql.Bit, saveAsUsual ? 1 : 0)
      .query(`INSERT INTO Orders (UserId, PointId, PickupTime, TotalAmount, IsUsual)
              OUTPUT INSERTED.OrderId
              VALUES (@userId, @pointId, @pickupTime, @total, @isUsual)`);
    const orderId = orderResult.recordset[0].OrderId;

    for (const i of items) {
      await new sql.Request(transaction)
        .input('orderId', sql.Int, orderId)
        .input('itemId', sql.Int, i.itemId)
        .input('qty', sql.Int, i.quantity)
        .input('price', sql.Decimal(6, 2), byId.get(i.itemId).Price)
        .query(`INSERT INTO OrderItems (OrderId, ItemId, Quantity, UnitPrice)
                VALUES (@orderId, @itemId, @qty, @price)`);
    }

    await transaction.commit();
    res.status(201).json({ orderId, total, status: 'pending_payment' });
  } catch (err) {
    if (transaction) await transaction.rollback().catch(() => {});
    next(err);
  }
});

// GET /api/orders/mine  – order history, newest first
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT o.OrderId, o.Status, o.TotalAmount, o.PickupTime, o.IsUsual, o.CreatedAt,
               cp.Name AS PointName,
               oi.ItemId, oi.Quantity, oi.UnitPrice, oi.ItemStatus,
               m.Name AS ItemName, s.Name AS StallName
        FROM Orders o
        JOIN CollectionPoints cp ON cp.PointId = o.PointId
        JOIN OrderItems oi ON oi.OrderId = o.OrderId
        JOIN MenuItems m ON m.ItemId = oi.ItemId
        JOIN Stalls s ON s.StallId = m.StallId
        WHERE o.UserId = @userId
        ORDER BY o.CreatedAt DESC`);

    // Group the flat rows into orders with an items list
    const orders = new Map();
    for (const r of result.recordset) {
      if (!orders.has(r.OrderId)) {
        orders.set(r.OrderId, {
          id: r.OrderId, status: r.Status, total: Number(r.TotalAmount), pickupTime: r.PickupTime,
          isUsual: r.IsUsual, createdAt: r.CreatedAt, collectionPoint: r.PointName, items: [],
        });
      }
      orders.get(r.OrderId).items.push({
        itemId: r.ItemId, name: r.ItemName, stall: r.StallName,
        quantity: r.Quantity, unitPrice: Number(r.UnitPrice), status: r.ItemStatus,
      });
    }
    res.json([...orders.values()]);
  } catch (err) {
    next(err);
  }
});

// TODO (NETS QR payment epic):
// POST /api/orders/:id/pay      – request a NETS QR code for the order
// POST /api/orders/nets-webhook – NETS confirms payment, set Status = 'paid'
router.post('/:id/pay', requireAuth, (req, res) => {
  res.status(501).json({ error: 'NETS QR payment is not built yet' });
});

module.exports = router;
