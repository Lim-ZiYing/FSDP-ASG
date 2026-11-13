// Owner: Dana – photo upload, AI food check, top photo
// Mounted at /api/photos. Images go to Supabase Storage; the AI call lives in services/aiFoodCheck.js.
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const { supabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const { notBuilt } = require('../notBuilt');
const { checkFoodPhoto, isConfigured } = require('../services/aiFoodCheck');
const { getTopPhoto } = require('../services/topPhotos');

const router = express.Router();

const BUCKET = 'photos';
const MAX_BYTES = 5 * 1024 * 1024; // matches the bucket's 5 MB limit
const FILE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const SURE = 0.7; // AI confidence needed to approve or reject without a human

// Keep the file in memory: it goes straight to the AI check and then to Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => cb(null, Boolean(FILE_TYPES[file.mimetype])),
});

// Runs multer and turns its errors into friendly 400s
function acceptPhoto(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Photo must be 5 MB or smaller' });
    if (err) return res.status(400).json({ error: 'Could not read that photo. Try again.' });
    next();
  });
}

// Works out the real image type from the file's first bytes, because the browser's
// mimetype only reflects the file name. Returns a FILE_TYPES key, or null if it isn't one.
function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

// Decide what happens to a photo from the AI result
function decideStatus(ai) {
  if (!ai) return 'review';                                  // AI couldn't decide
  if (!ai.isFood) return ai.confidence >= SURE ? 'rejected' : 'review';
  if (ai.confidence < SURE || !ai.matchesDish) return 'review';
  return 'approved';
}

// GET  /api/photos/item/:itemId           community photos for a dish, most votes first (FSDP-34)
router.get('/item/:itemId', notBuilt('FSDP-34'));

// GET  /api/photos/item/:itemId/top       the photo the eMenu shows for this dish (FSDP-23)
// Returns { photo: { id, itemId, url, votes } } or { photo: null } if nobody has uploaded one yet.
router.get('/item/:itemId/top', async (req, res, next) => {
  try {
    const itemId = Number(req.params.itemId);
    if (!Number.isInteger(itemId) || itemId < 1) return res.status(400).json({ error: 'Invalid dish' });
    res.json({ photo: await getTopPhoto(itemId) });
  } catch (err) {
    next(err);
  }
});

// POST /api/photos/item/:itemId           upload a dish photo (FSDP-20)
// Send multipart/form-data with the image in a field called "photo".
// Responses:
//   201 { photo }  saved. photo.status is 'approved' (shows on the eMenu), 'review' or 'pending'
//   422            the AI is sure it isn't food. Nothing is saved.
router.post('/item/:itemId', requireAuth, acceptPhoto, async (req, res, next) => {
  try {
    const itemId = Number(req.params.itemId);
    if (!Number.isInteger(itemId) || itemId < 1) return res.status(400).json({ error: 'Invalid dish' });
    if (!req.file) return res.status(400).json({ error: 'Choose a JPG, PNG or WebP photo' });

    const imageType = detectImageType(req.file.buffer);
    if (!imageType) return res.status(400).json({ error: 'Choose a JPG, PNG or WebP photo' });

    const { data: dish, error: dishError } = await supabase
      .from('menu_items')
      .select('id, name')
      .eq('id', itemId)
      .maybeSingle();
    if (dishError) throw dishError;
    if (!dish) return res.status(404).json({ error: 'Dish not found' });

    // 1. AI food check (FSDP-21). Without an API key, photos wait for manual approval,
    //    unless PHOTO_AUTO_APPROVE=true (local testing only).
    let ai = null;
    let status;
    if (isConfigured()) {
      try {
        ai = await checkFoodPhoto(req.file.buffer, imageType, dish.name);
      } catch (err) {
        console.error('AI food check failed, sending photo to review:', err.message);
      }
      status = decideStatus(ai);
    } else {
      status = process.env.PHOTO_AUTO_APPROVE === 'true' ? 'approved' : 'pending';
    }

    if (status === 'rejected') {
      return res.status(422).json({ error: "That doesn't look like food. Try a clearer photo of the dish." });
    }

    // 2. Save the image to Supabase Storage
    const path = `items/${itemId}/${crypto.randomUUID()}.${FILE_TYPES[imageType]}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, req.file.buffer, { contentType: imageType });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

    // 3. Save the photo row
    const { data: photo, error: insertError } = await supabase
      .from('photos')
      .insert({
        item_id: itemId,
        user_id: req.user.userId,
        image_url: publicUrl,
        ai_is_food: ai ? ai.isFood : null,
        ai_confidence: ai ? Number(ai.confidence.toFixed(3)) : null,
        ai_matches_dish: ai ? ai.matchesDish : null,
        status,
      })
      .select('id, item_id, image_url, status, created_at')
      .single();
    if (insertError) {
      await supabase.storage.from(BUCKET).remove([path]); // don't leave an orphan file
      throw insertError;
    }

    res.status(201).json({
      photo: {
        id: photo.id,
        itemId: photo.item_id,
        url: photo.image_url,
        status: photo.status,
        createdAt: photo.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
