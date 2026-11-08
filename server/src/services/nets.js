// Owner: Declan – helpers that call the NETS QR Web API.
// Keep API keys in server/.env (NETS_API_KEY, NETS_PROJECT_ID), never in code.

async function createQr({ orderId, amount }) {
  throw new Error('createQr not built yet (FSDP-16)');
}

async function checkPaymentStatus({ orderId }) {
  throw new Error('checkPaymentStatus not built yet (FSDP-17)');
}

module.exports = { createQr, checkPaymentStatus };
