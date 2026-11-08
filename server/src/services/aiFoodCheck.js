// Owner: Dana – AI "is this photo food?" check (FSDP-56 spike, FSDP-57, FSDP-21).
// Keep the AI provider's API key in server/.env, never in code or the React app.

// Returns { isFood: boolean, confidence: number }
async function checkIsFood(imageBuffer) {
  throw new Error('checkIsFood not built yet (FSDP-21)');
}

module.exports = { checkIsFood };
