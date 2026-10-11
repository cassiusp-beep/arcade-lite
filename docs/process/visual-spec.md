# Visual Spec

> **Template.** Each section lists what to define. A **provisional** direction is filled in so step 1 can be built today. Replace it with your own spec and the code tokens (`src/app/globals.css`) will follow.

## Direction
_Two or three adjectives and one sentence on the feel._
**Provisional:** *Editorial, playful, confident.* Reads like a fashion-magazine quiz page, not a SaaS dashboard.

## Color
_Brand colors, neutrals, semantic colors (success/warning/error), and contrast rules._
**Provisional:**

| Token | Value | Use |
|---|---|---|
| `--paper` | `#F4EFE6` | Page background (warm off-white) |
| `--ink` | `#161412` | Primary text |
| `--muted` | `#6B645B` | Secondary text |
| `--accent` | `#E2462F` | One accent for primary actions and highlights |
| `--line` | `#161412` at 12% | Hairlines and borders |

Each style profile brings its own 5-color palette, which is shown on the card. App chrome stays neutral so the user's palette is the star.

## Typography
_Families, scale, weights, line heights, and where each is used._
**Provisional:** a high-contrast serif for display (Fraunces), a clean sans for UI (Geist). Display sizes run large and tight (40–56px on mobile), with body at 16–17px.

## Spacing and layout
_Grid, spacing scale, breakpoints, and safe areas._
**Provisional:** 4px base scale, 20px mobile gutter, single column up to 640px, and the primary action pinned in the bottom third.

## Shape and depth
_Radii, borders, shadows._
**Provisional:** hairline borders over shadows. Radius 16px for cards, full-pill buttons, and one hard offset shadow (ink, 4px) on the profile card for a print-collage feel.

## Imagery and iconography
_Photo style, illustration, icon set, and emoji policy._
**Provisional:** emoji are allowed only as answer illustrations in the quiz, one per answer, never in UI chrome.

## Motion
_Durations, easing, what animates, and reduced-motion behavior._
**Provisional:** 180–260ms ease-out. Question-to-question slides and the card "develops" in on reveal. All of it is disabled under `prefers-reduced-motion`.

## Components
_Buttons, cards, inputs, progress, sheets, toasts, and their states (default/hover/pressed/disabled/loading/error)._

## Web vs. mobile
_What changes above 640px / 1024px._
