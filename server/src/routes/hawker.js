// Owner: Zi Ying – live orders and hawker side
// Mounted at /api/hawker. Every route here is hawker-only.
const express = require('express');
const { supabase } = require('../supabase');
const { requireAuth, requireRole } = require('../middleware/auth');
const { notBuilt } = require('../notBuilt');

const router = express.Router();
router.use(requireAuth, requireRole('hawker'));

// GET   /api/hawker/orders                     incoming paid orders, sorted by pick-up time (FSDP-50)
router.get('/orders', notBuilt('FSDP-50'));

// PATCH /api/hawker/orders/:stallOrderId/status   body: { status }  Preparing → Ready → Collected (FSDP-51)
router.patch('/orders/:stallOrderId/status', notBuilt('FSDP-51'));

// PATCH /api/hawker/menu-items/:itemId/sold-out   body: { isSoldOut }  (FSDP-53, Sprint 2)
router.patch('/menu-items/:itemId/sold-out', notBuilt('FSDP-53'));

module.exports = router;
