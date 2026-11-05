const express = require('express');
const { sql, getPool } = require('../db');

const router = express.Router();

// Rough minutes per order in the queue, used for the "ready in ~X min" estimate
const MINUTES_PER_ORDER = 3;

// GET /api/stalls  – stalls with live queue, shortest queue first
router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT s.StallId, s.Name, s.Cuisine, s.UnitNo, s.AcceptsCdc, s.IsOpen, s.DefaultPhotoUrl,
             ISNULL(q.OrdersAhead, 0) AS OrdersAhead
      FROM Stalls s
      LEFT JOIN StallQueue q ON q.StallId = s.StallId
      ORDER BY s.IsOpen DESC, OrdersAhead ASC, s.Name`);

    res.json(result.recordset.map((s) => ({
      id: s.StallId,
      name: s.Name,
      cuisine: s.Cuisine,
      unitNo: s.UnitNo,
      acceptsCdc: s.AcceptsCdc,
      isOpen: s.IsOpen,
      photoUrl: s.DefaultPhotoUrl,
      ordersAhead: s.OrdersAhead,
      estimatedMinutes: Math.max(5, s.OrdersAhead * MINUTES_PER_ORDER),
    })));
  } catch (err) {
    next(err);
  }
});

// GET /api/stalls/:id/menu  – menu items with their top-voted photo
router.get('/:id/menu', async (req, res, next) => {
  try {
    const stallId = Number(req.params.id);
    if (!Number.isInteger(stallId)) return res.status(400).json({ error: 'Invalid stall id' });

    const pool = await getPool();
    const result = await pool.request()
      .input('stallId', sql.Int, stallId)
      .query(`
        SELECT m.ItemId, m.Name, m.Description, m.Price, m.IsSoldOut,
               COALESCE(t.ImageUrl, s.DefaultPhotoUrl) AS PhotoUrl,
               ISNULL(t.VoteCount, 0) AS TopPhotoVotes
        FROM MenuItems m
        JOIN Stalls s ON s.StallId = m.StallId
        LEFT JOIN TopPhotos t ON t.ItemId = m.ItemId
        WHERE m.StallId = @stallId
        ORDER BY m.IsSoldOut, TopPhotoVotes DESC, m.Name`);

    res.json(result.recordset.map((m) => ({
      id: m.ItemId,
      name: m.Name,
      description: m.Description,
      price: Number(m.Price),
      isSoldOut: m.IsSoldOut,
      photoUrl: m.PhotoUrl,
      topPhotoVotes: m.TopPhotoVotes,
    })));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
