import { describe, expect, it } from "vitest";
import { profileFromAnswers } from "../profile";
import { curatedVibe, sanitizeVibe } from "../soundtrack";

describe("soundtrack", () => {
  it("matches known artists offline, with a default for unknown ones", () => {
    const v = curatedVibe("frank ocean and Charli XCX");
    expect(v.colors.length).toBeGreaterThanOrEqual(2);
    expect(v.source).toBe("curated");
    expect(curatedVibe("some unknown band").keywords.length).toBeGreaterThan(0);
  });

  it("rejects malformed model output and strips dashes", () => {
    expect(sanitizeVibe({ colors: ["red"], keywords: [], line: "", weights: [] })).toBeNull();
    const ok = sanitizeVibe({ colors: ["#112233", "#445566"], keywords: ["Moody"], line: "Dark — and lovely", weights: [{ archetype: "midnight-scholar", score: 9 }] });
    expect(ok?.line).not.toMatch(/[—–]/);
    expect(ok?.weights["midnight-scholar"]).toBe(3);
  });

  it("lets music tip the profile and records the soundtrack", () => {
    const vibe = curatedVibe("Charli XCX");
    const profile = profileFromAnswers([], { text: "Charli XCX", vibe });
    expect(profile.archetypeId).toBe("neon-maximalist");
    expect(profile.soundtrack?.text).toBe("Charli XCX");
  });
});
