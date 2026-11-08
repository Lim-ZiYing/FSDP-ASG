// Owner: Declan – NETS QR payment
// Mounted at /api/payments. The NETS API calls themselves live in services/nets.js.
const express = require('express');
const { supabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const { notBuilt } = require('../notBuilt');

const router = express.Router();

// POST /api/payments/:orderId/nets-qr     create a NETS QR for this order (FSDP-16)
router.post('/:orderId/nets-qr', requireAuth, notBuilt('FSDP-16'));

// GET  /api/payments/:orderId/status      has this order been paid? (FSDP-17)
router.get('/:orderId/status', requireAuth, notBuilt('FSDP-17'));

// POST /api/payments/nets/notify          NETS tells us a payment succeeded (FSDP-17)
//      No requireAuth here – NETS calls it, not a user. Verify it really came from NETS.
router.post('/nets/notify', notBuilt('FSDP-17'));

// Sprint 2: retry a failed or timed-out payment (FSDP-44)

module.exports = router;
