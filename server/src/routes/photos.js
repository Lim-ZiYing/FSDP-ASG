// Owner: Dana – photo upload, AI food check, top photo
// Mounted at /api/photos. Images go to Supabase Storage; the AI call lives in services/aiFoodCheck.js.
const express = require('express');
const { supabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const { notBuilt } = require('../notBuilt');

const router = express.Router();

// GET  /api/photos/item/:itemId           community photos for a dish, most votes first (FSDP-34)
router.get('/item/:itemId', notBuilt('FSDP-34'));

// POST /api/photos/item/:itemId           upload a dish photo (FSDP-20), AI check in Sprint 2 (FSDP-21)
router.post('/item/:itemId', requireAuth, notBuilt('FSDP-20'));

// Top photo per dish (FSDP-23): most votes wins, earliest upload breaks ties.
// Siyu's GET /api/stalls/:id/menu uses this, so agree with Siyu how it's exposed
// (e.g. a database view she can query).

module.exports = router;
