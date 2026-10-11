import { describe, expect, it } from "vitest";
import { directSunHours, exposureFromHours, sunBearing, yearlySunHours } from "../sun";

const LA = [34.05, -118.24] as const;

describe("sun model", () => {
  it("converts SunCalc azimuth (from south) to a compass bearing", () => {
    expect(sunBearing(0)).toBe(180);
    expect(sunBearing(Math.PI / 2)).toBe(270);
    expect(sunBearing(-Math.PI / 2)).toBe(90);
  });

  it("gives a south window in LA far more yearly sun than a north one", () => {
    const south = yearlySunHours(...LA, "south", 2026);
    const north = yearlySunHours(...LA, "north", 2026);
    expect(south).toBeGreaterThan(north + 2);
    expect(south).toBeLessThan(13);
  });

  it("gives a north window little or no winter sun", () => {
    expect(directSunHours(...LA, "north", new Date(Date.UTC(2026, 11, 21)))).toBeLessThan(1);
  });

  it("buckets hours into exposure levels", () => {
    expect(exposureFromHours(0.5)).toBe("low");
    expect(exposureFromHours(2.5)).toBe("medium");
    expect(exposureFromHours(6)).toBe("high");
  });
});
