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

export type CatalogItem = { categoryId: string; name: string; imageUrl: string | null; mesh: MeshKind; blurb: string };

/** A generated product as the client keeps it (localStorage + fallback JSON). */
export type GeneratedProduct = {
  productId: string;
  patternId: string;
  title: string;
  categoryName: string;
  mesh: MeshKind;
  imageUrl: string;
  patternImageUrl: string;
  price: { amount: string; currency: string } | null;
  selectionLabel: string;
  careInstructions: string;
  prompt: string;
  fallback?: boolean;
};

const MAX_PROMPT = 600;

/** Turn a style profile (plus an optional idea) into an Arcade pattern prompt. */
export function buildPrompt(profile: StyleProfile, categoryName: string, idea?: string, inspiration?: string[]): string {
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
