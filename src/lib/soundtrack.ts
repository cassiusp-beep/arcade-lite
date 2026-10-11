import { ARCHETYPE_IDS, type ArchetypeId } from "./quiz/archetypes";

/** What someone's music adds to their aura and style profile. */
export type SonicVibe = {
  colors: string[];
  keywords: string[];
  /** One short line read back to the shopper, e.g. "Hazy bedroom pop with a vintage heart." */
  line: string;
  weights: Partial<Record<ArchetypeId, number>>;
  source: "gemini" | "curated";
};

type Seed = { colors: string[]; keywords: string[]; line: string; weights: Partial<Record<ArchetypeId, number>> };

const V = {
  dreamy: { colors: ["#F2C6DE", "#BFD7EA"], keywords: ["Dreamy", "Soft"], line: "Soft-focus and a little nostalgic.", weights: { "salt-air-romantic": 2, "sunlit-archivist": 1 } },
  hyper: { colors: ["#FF2E93", "#00F5D4"], keywords: ["Hyper", "Glossy"], line: "Loud, glossy and built for the group chat.", weights: { "neon-maximalist": 3 } },
  moody: { colors: ["#3B1E54", "#9B2335"], keywords: ["Moody", "Velvet"], line: "Low light, high drama, great lyrics.", weights: { "midnight-scholar": 3 } },
  earthy: { colors: ["#6B8F47", "#D9A441"], keywords: ["Earthy", "Warm"], line: "Sun on the porch and dirt on the boots.", weights: { "wild-botanist": 2, "sunlit-archivist": 1 } },
  vintage: { colors: ["#C8743A", "#E8D8B9"], keywords: ["Vinyl", "Golden"], line: "Crate-dug, warm and timeless.", weights: { "sunlit-archivist": 3 } },
  minimal: { colors: ["#D6D1CD", "#8A8174"], keywords: ["Minimal", "Clean"], line: "Space between the notes. Very you.", weights: { "quiet-luxe": 3 } },
} satisfies Record<string, Seed>;

/** Well-known artists → vibe. Covers ?demo=1 and Gemini outages; not meant to be exhaustive. */
const ARTISTS: Record<string, Seed> = {
  "frank ocean": V.dreamy, clairo: V.dreamy, "beach house": V.dreamy, "lana del rey": V.moody, "mitski": V.moody,
  "phoebe bridgers": V.moody, "the cure": V.moody, "arctic monkeys": V.moody, "hozier": V.moody, "billie eilish": V.moody,
  "charli xcx": V.hyper, "doja cat": V.hyper, "beyonce": V.hyper, "beyoncé": V.hyper, "nicki minaj": V.hyper, "britney spears": V.hyper,
  "dua lipa": V.hyper, "chappell roan": V.hyper, "sabrina carpenter": V.hyper, "ice spice": V.hyper, "newjeans": V.hyper, "blackpink": V.hyper,
  "zach bryan": V.earthy, "noah kahan": V.earthy, "fleetwood mac": V.vintage, "bon iver": V.earthy, "the lumineers": V.earthy, "kacey musgraves": V.earthy,
  "the beatles": V.vintage, "amy winehouse": V.vintage, "stevie wonder": V.vintage, "sade": V.vintage, "led zeppelin": V.vintage, "sza": V.dreamy,
  "taylor swift": V.dreamy, "olivia rodrigo": V.hyper, "kendrick lamar": V.moody, "tyler, the creator": V.hyper, "tyler the creator": V.hyper,
  "brian eno": V.minimal, "nils frahm": V.minimal, "khruangbin": V.vintage, "radiohead": V.minimal, "daniel caesar": V.dreamy, "steve lacy": V.vintage,
  lofi: V.minimal, "lo-fi": V.minimal, jazz: V.vintage, country: V.earthy, techno: V.minimal, "k-pop": V.hyper, kpop: V.hyper, indie: V.dreamy, classical: V.minimal,
};

/** Instant, offline match. Falls back to a gentle default so the step always pays off. */
export function curatedVibe(text: string): SonicVibe {
  const t = text.toLowerCase();
  const hits = Object.entries(ARTISTS).filter(([name]) => t.includes(name)).map(([, seed]) => seed);
  const seeds = hits.length ? hits.slice(0, 2) : [V.dreamy];
  const merged: Partial<Record<ArchetypeId, number>> = {};
  for (const s of seeds) for (const [k, w] of Object.entries(s.weights)) merged[k as ArchetypeId] = (merged[k as ArchetypeId] ?? 0) + (w ?? 0);
  return {
    colors: [...new Set(seeds.flatMap((s) => s.colors))].slice(0, 3),
    keywords: [...new Set(seeds.flatMap((s) => s.keywords))].slice(0, 3),
    line: seeds[0].line,
    weights: merged,
    source: "curated",
  };
}

/** Keep whatever Gemini returns inside the shapes the UI and scorer expect. */
export function sanitizeVibe(raw: unknown): SonicVibe | null {
  const r = raw as { colors?: unknown; keywords?: unknown; line?: unknown; weights?: { archetype?: string; score?: number }[] };
  const colors = Array.isArray(r?.colors) ? r.colors.filter((c): c is string => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c)).slice(0, 3) : [];
  const keywords = Array.isArray(r?.keywords) ? r.keywords.filter((k): k is string => typeof k === "string" && k.length < 20).map((k) => k.trim().split(/\s+/)[0]).slice(0, 3) : [];
  const line = typeof r?.line === "string" ? r.line.replace(/[—–]/g, ",").trim().slice(0, 100) : "";
  const weights: Partial<Record<ArchetypeId, number>> = {};
  for (const w of Array.isArray(r?.weights) ? r.weights : []) {
    if (w?.archetype && (ARCHETYPE_IDS as string[]).includes(w.archetype)) weights[w.archetype as ArchetypeId] = Math.max(1, Math.min(3, Number(w.score) | 0));
  }
  if (colors.length < 2 || !keywords.length || !line || !Object.keys(weights).length) return null;
  return { colors, keywords, line, weights, source: "gemini" };
}
