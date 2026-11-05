const express = require('express');
const { sql, getPool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/photos/item/:itemId  – community photos for a dish, most votes first
router.get('/item/:itemId', async (req, res, next) => {
  try {
    const itemId = Number(req.params.itemId);
    if (!Number.isInteger(itemId)) return res.status(400).json({ error: 'Invalid item id' });

    const pool = await getPool();
    const result = await pool.request()
      .input('itemId', sql.Int, itemId)
      .query(`
        SELECT p.PhotoId, p.ImageUrl, p.CreatedAt, u.Name AS UploadedBy,
               COUNT(v.PhotoId) AS VoteCount
        FROM Photos p
        JOIN Users u ON u.UserId = p.UserId
        LEFT JOIN Votes v ON v.PhotoId = p.PhotoId
        WHERE p.ItemId = @itemId AND p.AiCheck = 'passed'
        GROUP BY p.PhotoId, p.ImageUrl, p.CreatedAt, u.Name
        ORDER BY VoteCount DESC, p.CreatedAt ASC`);

    res.json(result.recordset.map((p) => ({
      id: p.PhotoId,
      url: p.ImageUrl,
      uploadedBy: p.UploadedBy,
      createdAt: p.CreatedAt,
      votes: p.VoteCount,
    })));
  } catch (err) {
    next(err);
  }
});

// POST /api/photos/:photoId/vote  – one vote per user per photo (enforced by the Votes primary key)
router.post('/:photoId/vote', requireAuth, async (req, res, next) => {
  try {
    const photoId = Number(req.params.photoId);
    if (!Number.isInteger(photoId)) return res.status(400).json({ error: 'Invalid photo id' });

    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, req.user.userId)
      .input('photoId', sql.Int, photoId)
      .query('INSERT INTO Votes (UserId, PhotoId) VALUES (@userId, @photoId)');
    res.status(201).json({ voted: true });
  } catch (err) {
    if (err.number === 2627) return res.status(409).json({ error: 'You already voted for this photo' });
    if (err.number === 547) return res.status(404).json({ error: 'Photo not found' });
    next(err);
  }
});

// DELETE /api/photos/:photoId/vote  – take a vote back
router.delete('/:photoId/vote', requireAuth, async (req, res, next) => {
  try {
    const photoId = Number(req.params.photoId);
    if (!Number.isInteger(photoId)) return res.status(400).json({ error: 'Invalid photo id' });

    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, req.user.userId)
      .input('photoId', sql.Int, photoId)
      .query('DELETE FROM Votes WHERE UserId = @userId AND PhotoId = @photoId');
    res.json({ voted: false });
  } catch (err) {
    next(err);
  }
});

// TODO (Photo upload + AI check epic):
// POST /api/photos/item/:itemId  – accept an image upload (e.g. with multer),
// run the AI food check, save with AiCheck = 'passed' or 'rejected'.
router.post('/item/:itemId', requireAuth, (req, res) => {
  res.status(501).json({ error: 'Photo upload is not built yet' });
});

module.exports = router;
