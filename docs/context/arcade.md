# Arcade Hackathon Context

> Arcade "Shopping 3.0" AI-commerce hackathon · one day · **ends 6pm PT, 2026-10-11**
> For endpoint details, use the installed `arcade-api` skill (`.claude/skills/arcade-api/SKILL.md`). For key handling and safety rules, use `arcade-api-test-drive`.

## What Arcade is

Arcade (docs.arcade.ai) is a generative-commerce API: **"From your imagination to your doorstep."** You generate a pattern from a text prompt, refine it, turn it into a real made-to-order product (print goods or jewelry), and check out. This is *not* arcade.dev, the agent tool-calling platform.

- Docs index: https://docs.arcade.ai/llms.txt · OpenAPI: https://platform.arcade.ai/v1/spec.json
- API keys: https://studio.arcade.ai/settings/api-keys (keys start with `arcade_sk_live_`, are shown once, and expire after 90 days)

## Client rules

| Rule | Detail |
|---|---|
| Base URL | `https://platform.arcade.ai/v1` |
| Method | Every request is `POST` with a JSON body, reads included (`{}` when there are no params) |
| Auth | `Authorization: Bearer $ARCADE_API_KEY`, **server-side only** (Next.js route handlers). Never sent to the browser, logged, or committed. |
| User-Agent | **Required**: `User-Agent: arcade-lite/0.1 (<contact email>)`, set via `ARCADE_USER_AGENT`. A missing or default UA gets a non-JSON 403 from Cloudflare. |
| `requestId` | 1–128 chars, unique per distinct request. Reuse it only to retry an identical body; a different body returns 409. |
| Polling | `jobs/get` every 2–5s, never faster than 2s. Generation usually takes 1–2 min. The edge returns 429 if you go faster. |
| Concurrency | Run one generation at a time unless the human asks otherwise |
| URLs | `imageUrl` / `thumbnailUrl` expire. Re-fetch the resource to renew them, and cache image bytes for the demo. |
| Real money | Checkouts create real, charged orders. **Never pay or automate payment.** |

## The flow (print products)

```
categories/list ─► pick a `print` category
patterns/create {requestId, prompt, referenceIds?, colors?}  ─► jobId
jobs/get {jobId} (poll) ─► result.patternId
[optional] patterns/refine/recolorClusters (sync) → patterns/refine/recolor | edit | crop | makeSeamless … ─► job ─► new patternId
categories/get {categoryId, selections:{}} ─► complete selections + canManufacture
products/create {requestId, patternId, categoryId, selections (from the RESPONSE), fit?} ─► jobId
jobs/get (poll) ─► result.productId
products/get {productId} ─► images, unitPrice, selections
checkouts/create {requestId, lines:[{productId, quantity:1}], dropShip:true} ─► checkoutUrl
open checkoutUrl (the human pays, never us)
orders/get {checkoutId} ─► 404 until paid (expected)
```

**Shortcut:** `patterns/create` with a print `categoryId` builds the pattern *and* the product in one job (Arcade picks the options), and the result has both `patternId` and `productId`. Use this for speed in the demo.

**Jewelry:** pass a jewelry `categoryId` to `patterns/create`. It designs the piece and builds the product in one job. Send no `modelId`, `referenceIds`, or `colors`. `products/create` and refines return 400 for jewelry, and a prompt/category mismatch returns 400 with no job.

**References (inspiration kit):** `references/createUpload {requestId, mediaType, byteLength}` → PUT the bytes to `uploadUrl` with exactly the returned `requiredHeaders` (no API key) → `references/create {requestId, uploadId}` → `referenceId` → pass it in `referenceIds` on `patterns/create`.

**Gotchas:** a succeeded job can have `result: null`, so check before reading IDs. Don't hardcode category IDs. Pass `fit` if the aspect ratio doesn't match the product. Recolor needs cluster IDs from `recolorClusters`. Errors carry `code` and `message`: retry 5xx/429/409 with the same `requestId`, and fix the request on other 4xx.

## Our app: Arcade Lite

**Problem.** Shoppers miss a stylist or live associate helping them decide. Many don't know their own taste well enough to *design* a product.

**Idea.** Give them a personal style identity first. Then help them design a custom product with Arcade, and let them see it in their own space before buying.

### Build order (don't start a step until the previous one works end to end)

1. **Style quiz → profile card.** A branching quiz of 6–8 playful questions (BuzzFeed / magazine tone), including "what would your favorite celebrity buy?". It ends in a shareable card with the style name, a color palette, and 3 keywords. The profile is stored as structured JSON.
2. **Product generation.** The user picks a category (from `categories/list`). We combine the profile with an optional free-text idea into an Arcade prompt, then show the product image and price and a checkout button.
3. **"Your room."** Ask about window size, window direction, and how bright the room gets. Render an axonometric room in three.js (react-three-fiber) with the pattern as a texture on a category-matched mesh (pillow, rug, framed print…). Lighting reflects the answers, plus one line on how the product will hold up in that light.
4. **Stretch: inspiration kit.** A photo of something the user likes in a store is uploaded as an Arcade reference and steers the next generation. Keep a running list of saved inspirations.

### Constraints

- Mobile-first: it will be demoed on a phone.
- Single repo, deployable to Vercel in minutes.
- **The demo never stalls.** Mock anything slow with a fallback, and cache one successful generation (JSON + image) in `public/demo/`, and `/design?demo=1` uses it.
- **Out of scope today:** accounts, iMessage, 3D file export, wear metrics. (AR is now IN scope via `<model-viewer>` + AR Quick Look.)

### Judging / submission

- [ ] Judging criteria: _(fill in from the event brief)_
- [ ] Submission format and deadline details: _(fill in)_
- [ ] Demo length: _(fill in)_
