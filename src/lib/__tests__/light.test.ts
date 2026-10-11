import { describe, expect, it } from "vitest";
import { estimateFromPixels, facingFromHeading, lightAdvice, projectedFade, sunExposure, sunSmartColor, viewerLight } from "../light";

describe("room light", () => {
  it("rates a big sunny west window as high sun exposure", () => {
    expect(sunExposure({ windowSize: "wall", facing: "west", brightness: "sunny" })).toBe("high");
    expect(sunExposure({ windowSize: "small", facing: "north", brightness: "dim" })).toBe("low");
  });

  it("brightens the viewer for sunnier rooms", () => {
    const dim = viewerLight({ windowSize: "small", facing: "north", brightness: "dim" });
    const sunny = viewerLight({ windowSize: "wall", facing: "south", brightness: "sunny" });
    expect(sunny.exposure).toBeGreaterThan(dim.exposure);
    expect(sunny.shadowSoftness).toBeLessThan(dim.shadowSoftness);
  });

  it("writes advice that names the product and has no dashes", () => {
    for (const facing of ["north", "east", "south", "west"] as const) {
      const text = lightAdvice({ windowSize: "medium", facing, brightness: "bright" }, "Decorative Pillows");
      expect(text).toContain("decorative pillows");
      expect(text).not.toMatch(/[—–]/);
    }
  });

  it("estimates brightness and warmth from pixels", () => {
    const px = (r: number, g: number, b: number) => new Uint8ClampedArray(Array.from({ length: 64 }, () => [r, g, b, 255]).flat());
    expect(estimateFromPixels(px(20, 20, 20)).brightness).toBe("dim");
    expect(estimateFromPixels(px(240, 230, 210)).brightness).toBe("sunny");
    expect(estimateFromPixels(px(220, 160, 90)).warmth).toBeGreaterThan(0);
  });
});

describe("lifecycle", () => {
  it("rounds compass headings to the nearest facing", () => {
    expect(facingFromHeading(0)).toBe("north");
    expect(facingFromHeading(100)).toBe("east");
    expect(facingFromHeading(190)).toBe("south");
    expect(facingFromHeading(-80)).toBe("west");
    expect(facingFromHeading(350)).toBe("north");
  });

  it("fades faster in sunnier rooms and grows with years", () => {
    const sunny = { windowSize: "wall", facing: "west", brightness: "sunny" } as const;
    const shady = { windowSize: "small", facing: "north", brightness: "dim" } as const;
    expect(projectedFade(sunny, 5)).toBeGreaterThan(projectedFade(shady, 5));
    expect(projectedFade(sunny, 5)).toBeGreaterThan(projectedFade(sunny, 1));
    expect(projectedFade(sunny, 50)).toBeLessThanOrEqual(0.85);
  });
});



describe("sun-smart colorway", () => {
  it("softens saturated colors and keeps valid hex", () => {
    const out = sunSmartColor("#ff0055");
    expect(out).toMatch(/^#[0-9a-f]{6}$/);
    expect(out).not.toBe("#ff0055");
    expect(sunSmartColor("#808080")).toMatch(/^#[0-9a-f]{6}$/);
  });
});
