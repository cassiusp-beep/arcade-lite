# Judging Scorecard

> Arcade "Shopping 3.0" hackathon · **Submission due ~3:00pm PT, 2026-10-11** · Re-score at every checkpoint.
> Score each criterion 0–3: **0** missing · **1** exists but weak · **2** solid · **3** clearly stands out.
> Requirements marked **(gate)** are pass/fail. A failed gate costs more than any feature adds.

## Submission gates (must all pass)

| Gate | Pass condition | Status | Evidence / link |
|---|---|---|---|
| Public GitHub repo | Repo is public, README explains the project and how to run it, **no secrets committed** (`.env.local` gitignored, key never in history) | ☐ | |
| Public link | A URL a judge can open on their own device, with no install, login or allowlist | ☐ | |
| Live demo | Works live on stage on a phone. A cached fallback covers slow Arcade jobs, and it's rehearsed at least once end to end | ☐ | |
| Uses the Arcade API | Real calls to `platform.arcade.ai` (generation → product → checkout URL), visible in the demo | ☐ | |

## Scored criteria

The judges keep these loose on purpose. Defining them sharply is part of the score.

| Criterion | What a 3 looks like | Score (0–3) | Notes |
|---|---|---|---|
| **Who the customer is** | One specific person with a specific moment of doubt: *"shoppers who miss a stylist and don't trust their own taste enough to design a product."* Named in the README, the first demo sentence, and the UI copy | | |
| **How the API is used** | Arcade is the core of the product, not a bolt-on. Shows prompt built from the style profile → pattern → product → price → checkout URL. Uses at least one thing beyond the basic call (references from inspiration, recolor to the palette, category choice) | | |
| **Shopping 3.0 angle** | Clearly new versus a catalog with filters. The shopper goes from *finding* to *deciding*, and the app acts as the stylist | | |
| **Demo quality** | 2–3 minutes, one wow moment (profile reveal or seeing it in your room), never stalls | | |
| **Craft** | Mobile-first, passes `docs/process/anti-slop.md`, loading and error states designed | | |
| **Completeness of the core path** | Quiz → product → checkout works end to end for a stranger | | |

**Total:** __ / 18 · **Gates passed:** __ / 4

## Self-ranking log

Append one row per checkpoint. Be harsh: the judges will be.

| Time | Gates | Score | Biggest gap | Next action |
|---|---|---|---|---|
| 12:30 | 0/4 | 4/18 | No Arcade call, no public link, not deployed | Decide platform, then build generation and deploy |
