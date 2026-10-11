# Arcade Lite

**Your personal stylist for made-to-order home goods.** Built for the Arcade "Shopping 3.0" hackathon.

## Who it's for

Shoppers who miss having a stylist or store associate help them decide, and who don't trust their own taste enough to design a product from a blank prompt. Generative commerce gives them infinite options. Arcade Lite gives them *confidence*.

## How it works

1. **Personality quiz.** A playful, branching 6–7 question quiz names your style (e.g. *Sunlit Archivist*) with a palette and keywords, as a shareable card.
2. **Design with Arcade.** Pick a product (pillow, curtains, duvet, lampshade…). Your style profile becomes the Arcade prompt, and you get a real made-to-order product with its price and a checkout link.
3. **Your room and light.** Tell us about your windows and light, or snap a photo, and we preview the piece under your room's light, with a tip on how it will hold up.
4. **See it in AR.** On iPhone, place the product in your space with AR Quick Look (ARKit), right from the browser. No app install.
5. **In-store inspiration.** Scan a barcode and snap a photo of something you love in a store. It becomes an Arcade reference that steers your next design.

## How it uses the Arcade API

`categories/list` → `patterns/create` (prompt from the style profile + optional `referenceIds` from in-store inspiration, with a print `categoryId` so the pattern and product build in one job) → `jobs/get` polling → `products/get` (image + `unitPrice`) → `checkouts/create` (`dropShip: true`) → checkout URL. In-store photos go through `references/createUpload` → `references/create`.

All Arcade calls run server-side in Next.js route handlers (`src/app/api/arcade/*`). The API key never reaches the browser.

## Run it

```bash
npm install
cp .env.example .env.local   # add ARCADE_API_KEY and ARCADE_USER_AGENT
npm run dev                  # http://localhost:3000
npm test                     # quiz + profile unit tests
```

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 · three.js / `<model-viewer>` for room preview and AR · Vercel.

## Project docs

- `docs/context/arcade.md`: Arcade API context and build plan
- `docs/context/judging.md`: judging gates and self-scoring
- `docs/process/`: design principles, visual spec, anti-slop rules, and the demo script
- `CLAUDE.md` + `.claude/agents/`: the Claude Code agent team used to build this
