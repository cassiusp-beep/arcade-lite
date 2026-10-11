import type { ArchetypeId } from "./archetypes";

export type Weights = Partial<Record<ArchetypeId, number>>;

export type QuizOption = {
  id: string;
  label: string;
  emoji: string;
  weights: Weights;
  /** Next question id, or null when the quiz ends. */
  next: string | null;
};

export type QuizQuestion = {
  id: string;
  kicker: string;
  prompt: string;
  options: QuizOption[];
};

export const START_QUESTION_ID = "saturday";
export const CELEBRITY_QUESTION_ID = "celebrity";

/**
 * Branching quiz graph. The opener splits into a "soft" branch (texture, windowsill)
 * and a "bold" branch (color, pattern). Each branch may add a bonus question, then both
 * rejoin at the celebrity question. Every path is 6–7 questions (see quiz.test.ts).
 */
export const QUESTIONS: Record<string, QuizQuestion> = {
  saturday: {
    id: "saturday",
    kicker: "Let's start easy",
    prompt: "It's Saturday, 10am. Where are we finding you?",
    options: [
      { id: "market", label: "At the farmers market with a tote bag", emoji: "🧺", weights: { "wild-botanist": 2, "sunlit-archivist": 1 }, next: "texture" },
      { id: "bed", label: "Still in bed. Linen sheets. Don't call.", emoji: "🛏️", weights: { "quiet-luxe": 2, "salt-air-romantic": 1 }, next: "texture" },
      { id: "beach", label: "Already at the beach, obviously", emoji: "🌊", weights: { "salt-air-romantic": 3 }, next: "texture" },
      { id: "gallery", label: "At a gallery opening I wasn't technically invited to", emoji: "🖼️", weights: { "neon-maximalist": 2, "midnight-scholar": 1 }, next: "color" },
      { id: "bookshop", label: "Lost in a used bookshop", emoji: "📚", weights: { "midnight-scholar": 2, "sunlit-archivist": 1 }, next: "color" },
    ],
  },

  // Soft branch
  texture: {
    id: "texture",
    kicker: "Touch test",
    prompt: "Pick a texture to live inside forever.",
    options: [
      { id: "linen", label: "Nubby, rumpled linen", emoji: "🤍", weights: { "quiet-luxe": 2, "salt-air-romantic": 1 }, next: "windowsill" },
      { id: "leather", label: "Leather that's older than you", emoji: "🧳", weights: { "sunlit-archivist": 2, "midnight-scholar": 1 }, next: "windowsill" },
      { id: "wood", label: "Raw wood, a little splintery", emoji: "🪵", weights: { "wild-botanist": 2, "sunlit-archivist": 1 }, next: "windowsill" },
      { id: "velvet", label: "Velvet. Crushed. Jewel-toned.", emoji: "💎", weights: { "midnight-scholar": 2, "neon-maximalist": 1 }, next: "windowsill" },
    ],
  },
  windowsill: {
    id: "windowsill",
    kicker: "Be honest",
    prompt: "What's on your windowsill right now?",
    options: [
      { id: "jungle", label: "A small, thriving jungle", emoji: "🌿", weights: { "wild-botanist": 3 }, next: CELEBRITY_QUESTION_ID },
      { id: "ceramic", label: "One perfect ceramic. Nothing else.", emoji: "🏺", weights: { "quiet-luxe": 3 }, next: CELEBRITY_QUESTION_ID },
      { id: "shells", label: "Shells and sea glass from every trip", emoji: "🐚", weights: { "salt-air-romantic": 3 }, next: CELEBRITY_QUESTION_ID },
      { id: "thrifted", label: "A pile of thrifted treasures", emoji: "🕰️", weights: { "sunlit-archivist": 2 }, next: "flea" },
    ],
  },
  flea: {
    id: "flea",
    kicker: "Bonus round",
    prompt: "Flea market. You can only leave with one thing.",
    options: [
      { id: "candlesticks", label: "Mismatched brass candlesticks", emoji: "🕯️", weights: { "sunlit-archivist": 2, "midnight-scholar": 1 }, next: CELEBRITY_QUESTION_ID },
      { id: "poster", label: "A 70s concert poster", emoji: "🎸", weights: { "neon-maximalist": 2, "sunlit-archivist": 1 }, next: CELEBRITY_QUESTION_ID },
      { id: "map", label: "A hand-inked map of nowhere", emoji: "🗺️", weights: { "midnight-scholar": 2 }, next: CELEBRITY_QUESTION_ID },
    ],
  },

  // Bold branch
  color: {
    id: "color",
    kicker: "Color check",
    prompt: "Pick a color that's lowkey a personality.",
    options: [
      { id: "pink", label: "Hot pink, no apologies", emoji: "🩷", weights: { "neon-maximalist": 3 }, next: "pattern" },
      { id: "oxblood", label: "Oxblood", emoji: "🍷", weights: { "midnight-scholar": 3 }, next: "pattern" },
      { id: "sage", label: "Sage green", emoji: "🌱", weights: { "wild-botanist": 2, "quiet-luxe": 1 }, next: "pattern" },
      { id: "ivory", label: "Ivory (it's a color, actually)", emoji: "🥛", weights: { "quiet-luxe": 3 }, next: "pattern" },
    ],
  },
  pattern: {
    id: "pattern",
    kicker: "Pattern philosophy",
    prompt: "Your stance on patterns?",
    options: [
      { id: "more", label: "More is more. Then add one more.", emoji: "🌀", weights: { "neon-maximalist": 2 }, next: "clash" },
      { id: "stripes", label: "Stripes only, and only nautical", emoji: "⛵", weights: { "salt-air-romantic": 2, "quiet-luxe": 1 }, next: CELEBRITY_QUESTION_ID },
      { id: "florals", label: "Florals. Forever. Not just for spring.", emoji: "🌸", weights: { "wild-botanist": 2, "sunlit-archivist": 1 }, next: CELEBRITY_QUESTION_ID },
      { id: "plaid", label: "Plaid, tweed, maybe a houndstooth", emoji: "🧥", weights: { "midnight-scholar": 2 }, next: CELEBRITY_QUESTION_ID },
    ],
  },
  clash: {
    id: "clash",
    kicker: "Bonus round",
    prompt: "Clash test. Which combo makes you happiest?",
    options: [
      { id: "pink-orange", label: "Pink + orange", emoji: "🍑", weights: { "neon-maximalist": 2, "sunlit-archivist": 1 }, next: CELEBRITY_QUESTION_ID },
      { id: "cobalt-lime", label: "Cobalt + lime", emoji: "🍋", weights: { "neon-maximalist": 2, "wild-botanist": 1 }, next: CELEBRITY_QUESTION_ID },
      { id: "leopard-gingham", label: "Leopard + gingham", emoji: "🐆", weights: { "neon-maximalist": 1, "midnight-scholar": 1 }, next: CELEBRITY_QUESTION_ID },
    ],
  },

  // Shared ending
  celebrity: {
    id: "celebrity",
    kicker: "The real question",
    prompt: "Your favorite celebrity just walked into a home store. What do they buy?",
    options: [
      { id: "vase", label: "One $900 hand-thrown vase", emoji: "🏺", weights: { "quiet-luxe": 2 }, next: "golden-hour" },
      { id: "neon", label: "Everything in the neon section", emoji: "💡", weights: { "neon-maximalist": 2 }, next: "golden-hour" },
      { id: "rug", label: "A vintage rug with a scandalous history", emoji: "🧶", weights: { "sunlit-archivist": 2 }, next: "golden-hour" },
      { id: "books", label: "Books by the yard, leather-bound", emoji: "📖", weights: { "midnight-scholar": 2 }, next: "golden-hour" },
      { id: "fig", label: "A fig tree taller than they are", emoji: "🌳", weights: { "wild-botanist": 2 }, next: "golden-hour" },
      { id: "beach-house", label: "Linen everything, for the beach house", emoji: "🏖️", weights: { "salt-air-romantic": 2 }, next: "golden-hour" },
    ],
  },
  "golden-hour": {
    id: "golden-hour",
    kicker: "Picture it",
    prompt: "Golden hour hits your living room. What does it look like?",
    options: [
      { id: "glow", label: "Warm glow on a cluttered bookshelf", emoji: "🌅", weights: { "sunlit-archivist": 1, "midnight-scholar": 1 }, next: "soundtrack" },
      { id: "shadows", label: "Long clean shadows on bare walls", emoji: "🌗", weights: { "quiet-luxe": 2 }, next: "soundtrack" },
      { id: "disco", label: "A disco ball doing its thing", emoji: "🪩", weights: { "neon-maximalist": 2 }, next: "soundtrack" },
      { id: "leaves", label: "Light through a dozen leaves", emoji: "🍃", weights: { "wild-botanist": 1, "salt-air-romantic": 1 }, next: "soundtrack" },
    ],
  },
  soundtrack: {
    id: "soundtrack",
    kicker: "Last one",
    prompt: "Pick the soundtrack for your space.",
    options: [
      { id: "jazz", label: "Crackly jazz on vinyl", emoji: "🎷", weights: { "midnight-scholar": 1, "sunlit-archivist": 1 }, next: null },
      { id: "waves", label: "Waves and a ceiling fan", emoji: "🌬️", weights: { "salt-air-romantic": 2 }, next: null },
      { id: "pop", label: "Pop, loud, with dancing", emoji: "🎤", weights: { "neon-maximalist": 1 }, next: null },
      { id: "silence", label: "Expensive silence", emoji: "🤫", weights: { "quiet-luxe": 1 }, next: null },
      { id: "birds", label: "Birds, rain, a kettle", emoji: "🫖", weights: { "wild-botanist": 1 }, next: null },
    ],
  },
};
