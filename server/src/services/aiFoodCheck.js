// Owner: Dana – AI "is this photo food?" check (FSDP-56 spike, FSDP-57, FSDP-21).
// Provider chosen in the FSDP-56 spike: Gemini vision (see docs/spike-FSDP-56-ai-provider.md).
// Keep the API key in server/.env, never in code or the React app.
const { GoogleGenAI } = require('@google/genai');
const { z } = require('zod');

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const TIMEOUT_MS = 20000; // a slow AI call shouldn't hold up the upload; it goes to review instead

// The exact JSON shape Gemini must reply with
const FoodCheck = z.object({
  is_food: z.boolean(),        // the photo mainly shows food or a drink
  matches_dish: z.boolean(),   // it plausibly shows the named dish
  confidence: z.number(),      // 0 to 1, how sure Gemini is about is_food
  reason: z.string(),          // one short sentence, for the logs and hawker review
});
const { $schema, ...responseJsonSchema } = z.toJSONSchema(FoodCheck);

let client;
function getClient() {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: TIMEOUT_MS } });
  }
  return client;
}

function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// Checks one photo.
//   imageBuffer: the uploaded file's bytes
//   mimeType:    'image/jpeg' | 'image/png' | 'image/webp'
//   dishName:    e.g. 'Chicken Rice'
// Returns { isFood, matchesDish, confidence, reason }
//   or null when the check could not give an answer (the photo should go to manual review).
async function checkFoodPhoto(imageBuffer, mimeType, dishName) {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
        {
          text:
            `This photo was uploaded to a hawker centre food menu app for the dish "${dishName}". `
            + 'Is it a real photo of food or a drink (not a screenshot, meme, person or object)? '
            + 'Does it plausibly show that dish? Give your confidence that is_food is correct, from 0 to 1.',
        },
      ],
    }],
    config: { responseMimeType: 'application/json', responseJsonSchema },
  });

  // A blocked or cut-off reply has no usable answer
  let out;
  try {
    out = FoodCheck.parse(JSON.parse(response.text));
  } catch {
    return null;
  }

  return {
    isFood: out.is_food,
    matchesDish: out.matches_dish,
    confidence: Math.min(1, Math.max(0, out.confidence)),
    reason: out.reason,
  };
}

module.exports = { checkFoodPhoto, isConfigured };
