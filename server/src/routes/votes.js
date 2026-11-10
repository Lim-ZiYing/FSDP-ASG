// Owner: Siyu – upvoting
// Mounted at /api/votes. One vote per user per photo (FSDP-22).
const express = require('express');
const { supabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const { notBuilt } = require('../notBuilt');

const router = express.Router();

// POST   /api/votes/:photoId      upvote a photo (FSDP-22)
router.post('/:photoId', requireAuth, notBuilt('FSDP-22'));

// DELETE /api/votes/:photoId      take a vote back (FSDP-22)
router.delete('/:photoId', requireAuth, notBuilt('FSDP-22'));

module.exports = router;
