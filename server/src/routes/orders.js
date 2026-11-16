// Owner: Lennox – cart, ordering, pre-order and order history
// Mounted at /api/orders. Each route must return the SAME shape as its function in client/src/mocks.js.
// When yours works, delete its name from NOT_READY in client/src/api.js.
// Agree the orders / stall_orders columns and status names with Declan and Zi Ying before building.
const express = require('express');
const { supabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const { notBuilt } = require('../notBuilt');

const router = express.Router();
router.use(requireAuth);

// GET  /api/orders/pickup-slots?centreId=1&stallIds=1,2   pick-up times (FSDP-29, FSDP-33)   → mocks.js getPickupSlots
//      returns { asapMinutes, cutoffMinutes, slots: [{ time, available }] }
//      Keep this ABOVE '/:id', or Express will treat "pickup-slots" as an order id.
router.get('/pickup-slots', notBuilt('FSDP-33'));

// POST /api/orders                 turn the cart into an order (FSDP-14, multi-stall FSDP-65)   → mocks.js placeOrder
//      body: { centreId, collectionPointId, asap, pickupTime, items: [{ itemId, quantity, notes }] }
//      returns { id, orderNo, totalCents, status: 'pending_payment' }
//      Read prices from the database – never trust prices sent by the browser.
router.post('/', notBuilt('FSDP-14'));

// GET  /api/orders/mine            my orders, newest first (FSDP-18)   → mocks.js myOrders
router.get('/mine', notBuilt('FSDP-18'));

// GET  /api/orders/:id             one order as a receipt (FSDP-43, FSDP-45)   → mocks.js getOrder
router.get('/:id', notBuilt('FSDP-43 / FSDP-45'));

// POST /api/orders/:id/cancel      cancel before payment only (FSDP-44)   → mocks.js cancelOrder
//      returns { status: 'cancelled' }   409 if already paid
router.post('/:id/cancel', notBuilt('FSDP-44'));

module.exports = router;