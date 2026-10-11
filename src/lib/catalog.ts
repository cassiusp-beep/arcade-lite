import type { StyleProfile } from "./profile";

/** How a product is drawn in the room preview and in AR. */
export type MeshKind = "pillow" | "floor-pillow" | "curtain" | "duvet" | "tablecloth" | "lampshade";

/** Home categories we offer, matched by Arcade category name (ids come from categories/list). */
export const HOME_CATEGORIES: { name: string; mesh: MeshKind; blurb: string }[] = [
  { name: "Decorative Pillows", mesh: "pillow", blurb: "The easiest way to try a new look" },
  { name: "Curtains", mesh: "curtain", blurb: "Where your light meets your style" },
  { name: "Duvets", mesh: "duvet", blurb: "The biggest canvas in the room" },
  { name: "Floor Pillows", mesh: "floor-pillow", blurb: "Low, loungey, statement-making" },
  { name: "Tablecloths", mesh: "tablecloth", blurb: "Dinner party, upgraded" },
  { name: "Drum Lampshades", mesh: "lampshade", blurb: "Pattern that glows at night" },
];

/** Jewelry Arcade designs and builds in one job from the prompt (no 3D room; it lives on you). */
export const JEWELRY_CATEGORIES: { name: string; blurb: string; emoji: string }[] = [
  { name: "Stud Earrings", blurb: "Small, daily, very you", emoji: "✨" },
  { name: "Pendant Necklace", blurb: "Your aura on a chain", emoji: "📿" },
  { name: "Dainty Gemstone Ring", blurb: "A stone in your palette", emoji: "💍" },
  { name: "Dangle Earrings", blurb: "For main-character days", emoji: "🌙" },
];

export type World = "print" | "jewelry";
export type CatalogItem = { categoryId: string; name: string; imageUrl: string | null; mesh: MeshKind | null; blurb: string; world: World; emoji?: string };

/** A generated product as the client keeps it (localStorage + fallback JSON). */
export type GeneratedProduct = {
  productId: string;
  patternId: string;
  title: string;
  categoryId?: string;
  categoryName: string;
  /** Recolored by "Make it last": muted tones show fading less. */
  sunSmart?: boolean;
  /** Null for jewelry, which has no room model. */
  mesh: MeshKind | null;
  world?: World;
  imageUrl: string;
  patternImageUrl: string;
  price: { amount: string; currency: string } | null;
  selectionLabel: string;
  /** Arcade option values, e.g. { size: "22x14", embellishment: "piping_and_tassels" }. */
  selections?: Record<string, string>;
  careInstructions: string;
  prompt: string;
  fallback?: boolean;
};

const MAX_PROMPT = 600;

/** Turn a style profile (plus an optional idea) into an Arcade pattern prompt. */
export function buildPrompt(profile: StyleProfile, categoryName: string, idea?: string, inspiration?: string[], world: World = "print"): string {
  if (world === "jewelry") {
    // Arcade checks the prompt against the jewelry category, so name the piece plainly.
    return [
      idea?.trim() ? `${idea.trim()}.` : null,
      `A ${categoryName.toLowerCase()} for someone whose style is "${profile.styleName}": ${profile.keywords.join(", ").toLowerCase()}`,
      `inspired by a palette of ${profile.palette.slice(0, 3).map((s) => s.name.toLowerCase()).join(", ")}`,
    ]
      .filter(Boolean)
      .join(", ")
      .slice(0, MAX_PROMPT);
  }
  const parts = [
    idea?.trim() ? `${idea.trim()}.` : null,
    `A ${profile.keywords.join(", ").toLowerCase()} pattern for ${categoryName.toLowerCase()} in the "${profile.styleName}" style`,
    profile.promptSeed,
    inspiration?.length ? `inspired by ${inspiration.join("; ")}` : null,
  ];
  return parts.filter(Boolean).join(", ").slice(0, MAX_PROMPT);
}

export function formatPrice(price: GeneratedProduct["price"]) {
  if (!price) return "Price on checkout";
  const n = Number(price.amount);
  return Number.isFinite(n)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency }).format(n)
    : `${price.amount} ${price.currency}`;
}

const PRODUCT_KEY = "arcade-lite:product";

export function saveProduct(p: GeneratedProduct) {
  try {
    localStorage.setItem(PRODUCT_KEY, JSON.stringify(p));
  } catch {}
}

export function loadProduct(): GeneratedProduct | null {
  try {
    const raw = localStorage.getItem(PRODUCT_KEY);
    return raw ? (JSON.parse(raw) as GeneratedProduct) : null;
  } catch {
    return null;
  }
}

/** Which pieces the live face try-on supports (rings would need hand tracking). */
export function tryOnKind(name: string): "earrings" | "necklace" | null {
  const n = name.toLowerCase();
  if (n.includes("earring")) return "earrings";
  if (n.includes("necklace") || n.includes("pendant")) return "necklace";
  return null;
}
