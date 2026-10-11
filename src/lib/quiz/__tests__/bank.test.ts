import { describe, expect, it } from "vitest";
import { profileFromAnswers } from "../../profile";
import { ARCHETYPE_IDS } from "../archetypes";
import { BANK, QUIZ_LENGTH, drawQuiz } from "../bank";

describe("vibe-check bank", () => {
  it("has enough valid questions with aura data", () => {
    expect(BANK.length).toBeGreaterThanOrEqual(QUIZ_LENGTH);
    for (const q of BANK) {
      expect(q.prompt).not.toMatch(/[—–]/);
      for (const o of q.options) {
        expect(o.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(o.keyword.length).toBeGreaterThan(0);
        expect(Object.keys(o.weights).every((k) => (ARCHETYPE_IDS as string[]).includes(k))).toBe(true);
      }
    }
  });

  it("draws exactly 10 unique questions, Saturday first, windowsill included, same quiz for the same seed", () => {
    const quiz = drawQuiz(42)!;
    expect(quiz).toHaveLength(QUIZ_LENGTH);
    expect(new Set(quiz.map((q) => q.id)).size).toBe(QUIZ_LENGTH);
    expect(quiz[0].id).toBe("saturday");
    expect(quiz.some((q) => q.id === "windowsill")).toBe(true);
    expect(drawQuiz(42)!.map((q) => q.id)).toEqual(quiz.map((q) => q.id));
  });

  it("scores bank answers into a profile", () => {
    const quiz = drawQuiz(7)!;
    const answers = quiz.map((q) => ({ questionId: q.id, optionId: q.options[1].id }));
    const profile = profileFromAnswers(answers);
    expect(ARCHETYPE_IDS).toContain(profile.archetypeId);
  });
});
