import { ARCHETYPES, ARCHETYPE_IDS, type ArchetypeId, type Swatch } from "./quiz/archetypes";
import { ALL_QUESTIONS } from "./quiz/bank";
import type { SonicVibe } from "./soundtrack";

export type QuizAnswer = { questionId: string; optionId: string };

export type StyleProfile = {
  version: 1;
  archetypeId: ArchetypeId;
  secondaryId: ArchetypeId;
  styleName: string;
  tagline: string;
  palette: Swatch[];
  keywords: [string, string, string];
  answers: QuizAnswer[];
  /** Seed text for Arcade's patterns/create prompt (step 2). */
  promptSeed: string;
  /** What they're listening to and how we read it (step 2, optional). */
  soundtrack?: { text: string; line: string; keywords: string[] };
  createdAt: string;
};

type Weights = Partial<Record<ArchetypeId, number>>;

const STORAGE_KEY = "arcade-lite:profile";

/** Sum option weights. Ties break by ARCHETYPE_IDS order so results are deterministic. */
export function scoreAnswers(answers: QuizAnswer[], extra: Weights = {}): Record<ArchetypeId, number> {
  const scores = Object.fromEntries(ARCHETYPE_IDS.map((id) => [id, extra[id] ?? 0])) as Record<ArchetypeId, number>;
  for (const { questionId, optionId } of answers) {
    const option = ALL_QUESTIONS[questionId]?.options.find((o) => o.id === optionId);
    if (!option) continue;
    for (const [id, w] of Object.entries(option.weights)) scores[id as ArchetypeId] += w ?? 0;
  }
  return scores;
}

export function rankArchetypes(answers: QuizAnswer[], extra: Weights = {}): [ArchetypeId, ArchetypeId] {
  const scores = scoreAnswers(answers, extra);
  const ranked = [...ARCHETYPE_IDS].sort((a, b) => scores[b] - scores[a]);
  return [ranked[0], ranked[1]];
}

export function buildProfile(
  archetypeId: ArchetypeId,
  secondaryId: ArchetypeId,
  answers: QuizAnswer[] = [],
  /** Empty for profiles rebuilt from a share link (keeps server rendering deterministic). */
  createdAt = "",
): StyleProfile {
  const primary = ARCHETYPES[archetypeId];
  const secondary = ARCHETYPES[secondaryId];
  return {
    version: 1,
    archetypeId,
    secondaryId,
    styleName: primary.name,
    tagline: primary.tagline,
    palette: primary.palette,
    keywords: primary.keywords,
    answers,
    promptSeed: [
      ...primary.promptFragments,
      `with a hint of ${secondary.promptFragments[0]}`,
      `palette of ${primary.palette.map((s) => s.name.toLowerCase()).join(", ")}`,
    ].join(", "),
    createdAt,
  };
}

export function profileFromAnswers(answers: QuizAnswer[], music?: { text: string; vibe: SonicVibe }): StyleProfile {
  const [primary, secondary] = rankArchetypes(answers, music?.vibe.weights);
  const profile = buildProfile(primary, secondary, answers, new Date().toISOString());
  if (!music) return profile;
  return {
    ...profile,
    soundtrack: { text: music.text, line: music.vibe.line, keywords: music.vibe.keywords },
    promptSeed: `${profile.promptSeed}, with the mood of ${music.vibe.keywords.join(", ").toLowerCase()} music`,
  };
}

/* Share links carry only the archetype ids; everything else is rebuilt from ARCHETYPES. */

function toBase64Url(s: string) {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string) {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}

export function encodeProfile(profile: Pick<StyleProfile, "archetypeId" | "secondaryId">): string {
  return toBase64Url(JSON.stringify({ v: 1, a: profile.archetypeId, s: profile.secondaryId }));
}

export function decodeProfile(code: string | null | undefined): StyleProfile | null {
  if (!code) return null;
  try {
    const { a, s } = JSON.parse(fromBase64Url(code));
    if (!(a in ARCHETYPES) || !(s in ARCHETYPES)) return null;
    return buildProfile(a, s);
  } catch {
    return null;
  }
}

export function saveProfile(profile: StyleProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Private mode or storage blocked: the share link still carries the profile.
  }
}

/** Raw stored JSON. A string snapshot keeps useSyncExternalStore stable between renders. */
export function readProfileRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function parseProfile(raw: string | null): StyleProfile | null {
  try {
    return raw ? (JSON.parse(raw) as StyleProfile) : null;
  } catch {
    return null;
  }
}

export function loadProfile(): StyleProfile | null {
  return parseProfile(readProfileRaw());
}

export function subscribeProfile(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
