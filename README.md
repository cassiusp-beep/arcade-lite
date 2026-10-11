# Arcade Lite

**A personal stylist for made-to-order home goods and jewelry.** Built for the Arcade "Shopping 3.0" hackathon.

**Live:** https://arcade-lite.vercel.app (open it on an iPhone in Safari) · **Demo mode:** add `?demo=1` to any step

## Who it's for

Gen Z shoppers who are chronically online, know what they like when they see it, and miss having a stylist or store associate help them decide. Generative commerce gives them infinite options and a blank prompt box. Arcade Lite gives them **confidence**: it learns their taste from their actual life, designs something only they would own, shows it in their own space, and tells them how it will hold up.

## The journey

1. **Vibe check.** 10 quick questions about real life (coffee order, shoes by the door, your role in the group chat, AIM away messages). Every answer adds a color and a keyword to a live **aura card**. Questions are written by Gemini from tester feedback. Skippable.
2. **Soundtrack.** Type an artist or playlist. Gemini reads the music into colors, keywords and a one-line vibe that shifts your style. (Spotify / Apple Music connect is shown as a concept.)
3. **Style profile.** A shareable card: style name, palette, keywords, and what your music says about you.
4. **Design with Arcade.** Pick a pillow, curtains, duvet, lampshade or a piece of jewelry. Your profile becomes the Arcade prompt, and you get a real made-to-order product with its price.
5. **See it.** A 3D model built from the product's real options (size, piping, tassels, velvet), then **AR Quick Look** on iPhone to place it in your room. No app install.
6. **Your light.** An isometric room builds itself as you answer: point your phone's compass at your window, tell us how bright it gets, pick your wall color, and see your print at year 1, 3 and 5 in that light.
7. **Checkout** on Arcade.

Plus **in-store inspiration**: scan a barcode and snap something you love in a store; it becomes an Arcade reference that steers your next design.

## How it uses the Arcade API

| Step | Arcade calls |
|---|---|
| Catalog | `categories/list` (we curate home and jewelry categories, never hardcode IDs) |
| Design | `patterns/create` with the style-profile prompt and a `categoryId`, so pattern and product build in one job; `jobs/get` polling |
| Product | `products/get` (images, `unitPrice`, `selections` like `size: 22x14`, `embellishment: piping_and_tassels`) and `patterns/get` (the flat print for 3D) |
| 3D / AR | Models are generated from `selections` and the print is placed the way Arcade prints it, so the 3D and AR match the product photo |
| Checkout | `checkouts/create` with `dropShip: true` → Arcade checkout page |
| Inspiration | `references/createUpload` → upload → `references/create` → `referenceIds` on the next design |

All Arcade and Gemini calls run server-side in Next.js route handlers (`src/app/api/*`). No keys ever reach the browser.

## Run it

```bash
npm install
cp .env.example .env.local   # ARCADE_API_KEY, ARCADE_USER_AGENT, GEMINI_API_KEY
npm run dev                  # http://localhost:3000
npm test                     # quiz, profile, soundtrack and light-model tests
```

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 · `<model-viewer>` + three.js (3D and AR Quick Look) · anime.js (room and aura animation) · Gemini (quiz bank and music read) · zxing (barcodes) · Vercel.

## Project docs

- `docs/context/arcade.md`: Arcade API context
- `docs/context/judging.md`: judging gates and self-scoring
- `docs/process/`: design principles, visual spec, anti-slop rules, demo script
- `CLAUDE.md` + `.claude/agents/`: the Claude Code agent team and the journey's source of truth
