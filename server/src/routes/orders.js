// Owner: Lennox – cart, ordering, pre-order and order history
// Mounted at /api/orders. Agree the orders / stall_orders columns and
// status names with Declan and Zi Ying before building.
const express = require('express');
const { supabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const { notBuilt } = require('../notBuilt');

const router = express.Router();
router.use(requireAuth);

// POST /api/orders                 turn the cart into an order (FSDP-14; multi-stall FSDP-65 in Sprint 2)
//      body: { items: [{ itemId, quantity }], collectionPointId, pickupTime }
//      Read prices from the database – never trust prices sent by the browser.
router.post('/', notBuilt('FSDP-14'));

// GET  /api/orders/mine            my past orders (FSDP-18)
router.get('/mine', notBuilt('FSDP-18'));

// GET  /api/orders/:id             one order with its status (used by OrderConfirmed and TrackOrder)
router.get('/:id', notBuilt('FSDP-43 / FSDP-48'));

module.exports = router;
