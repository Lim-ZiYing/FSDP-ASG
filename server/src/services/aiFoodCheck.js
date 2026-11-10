// Owner: Dana – AI "is this photo food?" check (FSDP-56 spike, FSDP-57, FSDP-21).
// Provider chosen in the FSDP-56 spike: Claude vision (see docs/spike-FSDP-56-ai-provider.md).
// Keep the API key in server/.env, never in code or the React app.
const Anthropic = require('@anthropic-ai/sdk');
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
const { z } = require('zod');

const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';

// The exact JSON shape Claude must reply with
const FoodCheck = z.object({
  is_food: z.boolean(),        // the photo mainly shows food or a drink
  matches_dish: z.boolean(),   // it plausibly shows the named dish
  confidence: z.number(),      // 0 to 1, how sure Claude is about is_food
  reason: z.string(),          // one short sentence, for the logs and hawker review
});

let client;
function getClient() {
  if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY from .env
  return client;
}

function isConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Checks one photo.
//   imageBuffer: the uploaded file's bytes
//   mimeType:    'image/jpeg' | 'image/png' | 'image/webp'
//   dishName:    e.g. 'Chicken Rice'
// Returns { isFood, matchesDish, confidence, reason }
//   or null when the check could not give an answer (the photo should go to manual review).
async function checkFoodPhoto(imageBuffer, mimeType, dishName) {
  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 1024,
    output_config: { effort: 'low', format: zodOutputFormat(FoodCheck) },
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBuffer.toString('base64') } },
        {
          type: 'text',
          text:
            `This photo was uploaded to a hawker centre food menu app for the dish "${dishName}". `
            + 'Is it a real photo of food or a drink (not a screenshot, meme, person or object)? '
            + 'Does it plausibly show that dish? Give your confidence that is_food is correct, from 0 to 1.',
        },
      ],
    }],
  });

  // A refusal or a cut-off reply has no usable answer
  if (response.stop_reason === 'refusal' || !response.parsed_output) return null;

  const out = response.parsed_output;
  return {
    isFood: out.is_food,
    matchesDish: out.matches_dish,
    confidence: Math.min(1, Math.max(0, out.confidence)),
    reason: out.reason,
  };
}

module.exports = { checkFoodPhoto, isConfigured };
