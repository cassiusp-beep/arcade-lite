# Judging Scorecard

> Arcade "Shopping 3.0" hackathon · **Submission due ~3:00pm PT, 2026-10-11** · Re-score at every checkpoint.
> Score each criterion 0–3: **0** missing · **1** exists but weak · **2** solid · **3** clearly stands out.
> Requirements marked **(gate)** are pass/fail. A failed gate costs more than any feature adds.

## Submission gates (must all pass)

| Gate | Pass condition | Status | Evidence / link |
|---|---|---|---|
| Public GitHub repo | Repo is public, README explains the project and how to run it, **no secrets committed** (`.env.local` gitignored, key never in history) | ☑ | https://github.com/cassiusp-beep/arcade-lite |
| Public link | A URL a judge can open on their own device, with no install, login or allowlist | ☑ | https://arcade-lite.vercel.app |
| Live demo | Works live on stage on a phone. A cached fallback covers slow Arcade jobs, and it's rehearsed at least once end to end | ☐ | Fallbacks exist (`?demo=1` on quiz, design, room). AR confirmed on iPhone. **Needs one rehearsal.** |
| Uses the Arcade API | Real calls to `platform.arcade.ai` (generation → product → checkout URL), visible in the demo | ☑ | Real run 12:38: pillow generated in 57s, $88.35, checkout link created |

## Scored criteria

The judges keep these loose on purpose. Defining them sharply is part of the score.

| Criterion | What a 3 looks like | Score (0–3) | Notes |
|---|---|---|---|
| **Who the customer is** | One specific person with a specific moment of doubt: *"shoppers who miss a stylist and don't trust their own taste enough to design a product."* Named in the README, the first demo sentence, and the UI copy | 2 | Gen Z, chronically online, misses a stylist. In README + landing. Needs the first demo sentence. |
| **How the API is used** | Arcade is the core of the product, not a bolt-on. Shows prompt built from the style profile → pattern → product → price → checkout URL. Uses at least one thing beyond the basic call (references from inspiration, recolor to the palette, category choice) | 3 | Profile → prompt → `patterns/create` with categoryId → `jobs/get` → `products/get` selections drive 3D/AR → `checkouts/create`; references from in-store inspiration. Recolor not yet. |
| **Shopping 3.0 angle** | Clearly new versus a catalog with filters. The shopper goes from *finding* to *deciding*, and the app acts as the stylist | 2 | Stylist that learns taste from real life + music, then shows it in your space and light. Say "finding → deciding" out loud in the demo. |
| **Demo quality** | 2–3 minutes, one wow moment (profile reveal or seeing it in your room), never stalls | 1 | Not rehearsed yet. Gemini free tier is flaky: use `?demo=1`. |
| **Craft** | Mobile-first, passes `docs/process/anti-slop.md`, loading and error states designed | 2 | Mobile-first, editorial, designed loading/error states, 3D matches the product photo. Some screens untested on a real phone (inspire, compass). |
| **Completeness of the core path** | Quiz → product → checkout works end to end for a stranger | 3 | Quiz → soundtrack → profile → Arcade product → 3D/AR (confirmed on iPhone) → light room → checkout link. |

**Total:** 13 / 18 · **Gates passed:** 3 / 4 (as of 2:05pm)

## Self-ranking log

Append one row per checkpoint. Be harsh: the judges will be.

| Time | Gates | Score | Biggest gap | Next action |
|---|---|---|---|---|
| 12:30 | 0/4 | 4/18 | No Arcade call, no public link, not deployed | Decide platform, then build generation and deploy |
| 12:42 | 3/4 | 11/18 | AR not yet verified on a real iPhone; live demo not rehearsed; inspiration kit missing | Cassius tests AR on iPhone; build barcode + photo inspiration |
| 2:05 | 3/4 | 13/18 | No rehearsal; jewelry missing; Gemini free tier flaky | Add jewelry, rehearse with `?demo=1`, submit by 3:00 |
