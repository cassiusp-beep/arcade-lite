import { describe, expect, it } from "vitest";
import { ARCHETYPE_IDS } from "../archetypes";
import { CELEBRITY_QUESTION_ID, QUESTIONS, START_QUESTION_ID } from "../questions";
import { decodeProfile, encodeProfile, profileFromAnswers, type QuizAnswer } from "../../profile";

/** Every complete path through the quiz, as answer lists. */
function allPaths(): QuizAnswer[][] {
  const paths: QuizAnswer[][] = [];
  const walk = (questionId: string, path: QuizAnswer[]) => {
    if (path.length > 20) throw new Error(`Cycle near ${questionId}`);
    for (const option of QUESTIONS[questionId].options) {
      const next = [...path, { questionId, optionId: option.id }];
      if (option.next === null) paths.push(next);
      else walk(option.next, next);
    }
  };
  walk(START_QUESTION_ID, []);
  return paths;
}

describe("quiz graph", () => {
  it("only links to questions that exist", () => {
    for (const q of Object.values(QUESTIONS))
      for (const o of q.options) if (o.next !== null) expect(QUESTIONS[o.next], `${q.id}/${o.id}`).toBeDefined();
  });

  it("keeps every path between 6 and 8 questions, through the celebrity question", () => {
    const paths = allPaths();
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(p.length).toBeGreaterThanOrEqual(6);
      expect(p.length).toBeLessThanOrEqual(8);
      expect(p.some((a) => a.questionId === CELEBRITY_QUESTION_ID)).toBe(true);
    }
  });

  it("can land on every archetype", () => {
    const winners = new Set(allPaths().map((p) => profileFromAnswers(p).archetypeId));
    expect([...winners].sort()).toEqual([...ARCHETYPE_IDS].sort());
  });
});

describe("profile", () => {
  const path = allPaths()[0];

  it("scores deterministically, with distinct primary and secondary", () => {
    const a = profileFromAnswers(path);
    const b = profileFromAnswers(path);
    expect(a.archetypeId).toBe(b.archetypeId);
    expect(a.secondaryId).toBe(b.secondaryId);
    expect(a.secondaryId).not.toBe(a.archetypeId);
    expect(a.keywords).toHaveLength(3);
    expect(a.palette).toHaveLength(5);
  });

  it("round-trips through a share code", () => {
    const profile = profileFromAnswers(path);
    const decoded = decodeProfile(encodeProfile(profile));
    expect(decoded?.archetypeId).toBe(profile.archetypeId);
    expect(decoded?.secondaryId).toBe(profile.secondaryId);
    expect(decoded?.promptSeed).toBe(profile.promptSeed);
  });

  it("rejects garbage share codes", () => {
    expect(decodeProfile("not-base64!!")).toBeNull();
    expect(decodeProfile(encodeProfile({ archetypeId: "nope" as never, secondaryId: "quiet-luxe" }))).toBeNull();
    expect(decodeProfile(undefined)).toBeNull();
  });
});
