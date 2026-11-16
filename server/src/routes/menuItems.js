// Owner: Siyu – one dish for the dish page
// Mounted at /api/menu-items. Must return the SAME shape as getDish in client/src/mocks.js.
// When it works, delete 'getDish' from NOT_READY in client/src/api.js.
const express = require('express');
const { supabase } = require('../supabase');
const { notBuilt } = require('../notBuilt');

const router = express.Router();

// GET /api/menu-items/:id      one dish + its stall (FSDP-12 / FSDP-34)   → mocks.js getDish
//     returns { id, stallId, name, description, priceCents, category, prepMinutes, isAvailable,
//               photoUrl, topPhotoId, topPhotoVotes,
//               stall: { id, name, unitNo, isOpen, estimatedMinutes } }
router.get('/:id', notBuilt('FSDP-12'));

module.exports = router;