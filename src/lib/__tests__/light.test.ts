import { describe, expect, it } from "vitest";
import { estimateFromPixels, lightAdvice, sunExposure, viewerLight } from "../light";

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
