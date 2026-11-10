// Owner: Siyu – stall browsing and eMenu
// Mounted at /api/stalls
const express = require('express');
const { supabase } = require('../supabase');
const { notBuilt } = require('../notBuilt');

const router = express.Router();

// GET /api/stalls                  list stalls with live queue (FSDP-11)
router.get('/', notBuilt('FSDP-11'));

// GET /api/stalls/:id/menu         menu items with their top-voted photo (FSDP-12, FSDP-24)
router.get('/:id/menu', notBuilt('FSDP-12'));

// GET /api/stalls/search?q=        search stalls and dishes (FSDP-41, Sprint 3)
// Note: define /search ABOVE any '/:id' route that could swallow it.

module.exports = router;
