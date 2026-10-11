import { ARCHETYPES, type ArchetypeId } from "./archetypes";
import bankData from "./bank.json";
import { QUESTIONS, type QuizOption, type QuizQuestion } from "./questions";

/**
 * The vibe-check quiz: two hand-written anchors testers loved, then 8 questions drawn from a
 * Gemini-written bank (src/lib/quiz/bank.json, made by scripts/gen-quiz-bank.mjs). Each answer
 * carries a color and keyword so the aura card can build live.
 */
export type AuraOption = QuizOption & { color: string; keyword: string };
export type VibeQuestion = { id: string; topic: string; kicker: string; prompt: string; options: AuraOption[] };

export const QUIZ_LENGTH = 10;
const ANCHOR_IDS = ["saturday", "windowsill"];

export const BANK: VibeQuestion[] = (bankData as { questions: VibeQuestion[] }).questions;

/** Hand-written options have no aura fields: borrow them from the option's leading archetype. */
function withAura(option: QuizOption): AuraOption {
  const top = (Object.entries(option.weights) as [ArchetypeId, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "quiet-luxe";
  const a = ARCHETYPES[top];
  return { ...option, color: a.palette[1].hex, keyword: a.keywords[0] };
}

const ANCHORS: VibeQuestion[] = ANCHOR_IDS.map((id) => {
  const q = QUESTIONS[id];
  return { id: q.id, topic: q.id, kicker: q.kicker, prompt: q.prompt, options: q.options.map(withAura) };
});

/** Every question the scorer may see, by id (graph quiz + anchors + bank). */
export const ALL_QUESTIONS: Record<string, QuizQuestion> = {
  ...QUESTIONS,
  ...Object.fromEntries(BANK.map((q) => [q.id, { id: q.id, kicker: q.kicker, prompt: q.prompt, options: q.options }])),
};

/** Small seeded RNG so ?demo=1 always draws the same quiz. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** Anchors first, then bank questions with distinct topics. Null when the bank is too small. */
export function drawQuiz(seed = Date.now()): VibeQuestion[] | null {
  const pool = BANK.filter((q) => !ANCHOR_IDS.includes(q.id));
  if (pool.length < QUIZ_LENGTH - ANCHORS.length) return null;
  const rand = rng(seed);
  const shuffled = [...pool].sort(() => rand() - 0.5);
  const picked: VibeQuestion[] = [];
  const topics = new Set<string>();
  for (const q of shuffled) {
    if (picked.length === QUIZ_LENGTH - ANCHORS.length) break;
    if (topics.has(q.topic)) continue;
    topics.add(q.topic);
    picked.push(q);
  }
  for (const q of shuffled) if (picked.length < QUIZ_LENGTH - ANCHORS.length && !picked.includes(q)) picked.push(q);
  // Saturday opens; the windowsill lands mid-quiz as a breather.
  return [ANCHORS[0], ...picked.slice(0, 4), ANCHORS[1], ...picked.slice(4)];
}

/** If the bank is missing, a short quiz from the hand-written questions testers liked. */
export function fallbackQuiz(): VibeQuestion[] {
  return [ANCHORS[0], ANCHORS[1], ...["golden-hour", "soundtrack"].map((id) => {
    const q = QUESTIONS[id];
    return { id: q.id, topic: q.id, kicker: q.kicker, prompt: q.prompt, options: q.options.map(withAura) };
  })];
}
