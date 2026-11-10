# Spike FSDP-56: AI provider for the photo check

**Owner:** Dana · **Sprint:** 1 · **Feeds:** FSDP-20 (upload), FSDP-21 / FSDP-57 (AI check), FSDP-37 (AI features epic)

## Question

When someone uploads a dish photo, which AI service should tell us:

1. Is it actually food? (reject memes, selfies, screenshots)
2. Does it look like the dish it was uploaded to? (catch a photo of laksa posted under chicken rice)
3. How sure is it? (so that unsure photos go to a person instead of being auto-approved or auto-rejected)

The `photos` table already has columns for all three: `ai_is_food`, `ai_matches_dish`, `ai_confidence`.

## Options compared

| | Image-labelling API (e.g. Google Cloud Vision, AWS Rekognition) | Food-specific model (e.g. Clarifai food model) | Vision LLM (Claude) |
|---|---|---|---|
| "Is it food?" | Yes, via labels like *Food*, *Dish* | Yes | Yes |
| "Is it **this** dish?" | Weak. Labels are generic (*Rice*, *Noodle*). Local dishes like *char kway teow* are rarely a label | Better, but only for dishes in its list | Yes. We pass the dish name in the prompt, so it works for any hawker dish |
| Confidence score | Per label | Per label | Asked for in the reply |
| Reply format | Fixed label list we have to interpret | Fixed label list | Exact JSON shape we define (structured outputs) |
| Reuse for other AI features in the epic (descriptions, translations, search) | No | No | Yes, same key and SDK |
| Setup | Cloud project + service account JSON | Account + model ID | One API key in `server/.env` |
| Node.js SDK | Yes | Yes | Yes (`@anthropic-ai/sdk`) |

## Decision

**Use Claude vision through the official Anthropic SDK.**

- It is the only option that answers question 2 for local dishes without us building a dish list.
- Structured outputs guarantee the reply matches our schema, so the server never has to parse free text.
- The same integration covers the other stories in the AI features epic.

## How it works (already built in FSDP-20)

`server/src/services/aiFoodCheck.js` sends the image (base64) and the dish name, and gets back:

```json
{ "is_food": true, "matches_dish": true, "confidence": 0.93, "reason": "A plate of chicken rice with cucumber." }
```

`server/src/routes/photos.js` turns that into a photo status:

| AI result | Status | What the user sees |
|---|---|---|
| Food, matches the dish, confidence ≥ 0.7 | `approved` | Photo is live and can be upvoted |
| Not food, confidence ≥ 0.7 | not saved (422) | "That doesn't look like food" |
| Anything else, or the AI call fails | `review` | Photo waits for a person to check it |
| No API key configured | `pending` | Photo waits (or `approved` with `PHOTO_AUTO_APPROVE=true`, for local testing only) |

## Model and cost

The model is set by `AI_MODEL` in `server/.env`, so the team can switch without code changes.
Prices are Anthropic's list prices per million tokens (input / output), checked 6 Oct 2026. Check the current prices before the demo.

| Model | ID | Price per 1M tokens | Rough cost per photo* |
|---|---|---|---|
| Claude Opus 5.5 (current default) | `claude-opus-5-5` | $4 / $20 | about 1 cent |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | $2 / $10 | about half a cent |
| Claude Haiku 5.5 | `claude-haiku-5-5` | $0.10 / $0.50 | well under 0.1 cent |

\*Assumes a phone photo resized to about 1000×1000 px (≈1,300 input tokens) plus a few hundred output tokens. Large images are scaled down by the API, so the cost doesn't grow without limit.

**Team decision needed:** Opus 5.5 is the most accurate. Haiku 5.5 costs about 40 times less and is probably enough for "is this food?". Suggestion: test both on 20 photos (10 hawker dishes, 10 non-food) in Sprint 2 and keep the cheapest one that gets them all right.

## Risks

- **API key:** only in `server/.env`, never in the React app or on GitHub.
- **Cost if someone spams uploads:** the 5 MB limit and login requirement help. Add a per-user daily upload limit if needed (Sprint 2).
- **Refusals or outages:** treated as `review`, so a failed check never auto-approves a photo.

## Follow-up stories

- FSDP-21 / FSDP-57: run the 20-photo test and set `AI_MODEL`.
- Hawker or admin screen to approve or reject `review` photos.
