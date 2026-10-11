import { exposureFromHours } from "./sun";

/** Room light model: answers (or a photo estimate) → viewer lighting + one line of advice. */
export type WindowSize = "small" | "medium" | "wall";
export type Facing = "north" | "east" | "south" | "west";
export type Brightness = "dim" | "bright" | "sunny";

export type RoomLight = {
  windowSize: WindowSize;
  facing: Facing;
  brightness: Brightness;
  warmth?: number;
  /** Yearly-average direct sun hours from SunCalc (when we know their location). */
  sunHours?: number;
};

export type ViewerLight = {
  exposure: number;
  shadowSoftness: number;
  /** CSS color washed over the 3D preview to suggest the light's temperature. */
  wash: string;
};

const SIZE_GAIN: Record<WindowSize, number> = { small: 0.9, medium: 1, wall: 1.15 };
const BRIGHT_GAIN: Record<Brightness, number> = { dim: 0.7, bright: 1, sunny: 1.3 };
const FACING_WASH: Record<Facing, string> = {
  north: "rgb(170 195 230 / 0.18)",
  east: "rgb(255 220 170 / 0.14)",
  south: "rgb(255 236 200 / 0.10)",
  west: "rgb(255 170 100 / 0.20)",
};

export function viewerLight(room: RoomLight): ViewerLight {
  return {
    exposure: Math.round(SIZE_GAIN[room.windowSize] * BRIGHT_GAIN[room.brightness] * 100) / 100,
    shadowSoftness: room.brightness === "sunny" ? 0.2 : room.brightness === "bright" ? 0.6 : 1,
    // A measured photo beats the compass guess for color temperature.
    wash:
      room.warmth === undefined
        ? FACING_WASH[room.facing]
        : room.warmth > 0.08
          ? "rgb(255 190 120 / 0.18)"
          : room.warmth < -0.03
            ? "rgb(170 195 230 / 0.18)"
            : "rgb(255 255 255 / 0)",
  };
}

/** Direct sun on fabric is what fades prints: south and west windows, big glass, sunny rooms. */
export function sunExposure(room: RoomLight): "low" | "medium" | "high" {
  if (room.sunHours !== undefined) {
    // Sun math knows geometry; the brightness answer knows the trees and buildings outside.
    const levels = ["low", "medium", "high"] as const;
    const base = levels.indexOf(exposureFromHours(room.sunHours));
    const shift = room.brightness === "dim" ? -1 : room.brightness === "sunny" ? 1 : 0;
    return levels[Math.max(0, Math.min(2, base + shift))];
  }
  let score = { north: 0, east: 1, south: 2, west: 2 }[room.facing];
  score += { small: 0, medium: 1, wall: 2 }[room.windowSize];
  score += { dim: 0, bright: 1, sunny: 2 }[room.brightness];
  return score >= 5 ? "high" : score >= 3 ? "medium" : "low";
}

export function lightAdvice(room: RoomLight, productName: string): string {
  const item = productName.toLowerCase();
  const level = sunExposure(room);
  if (level === "high")
    return `Your ${item} will get strong direct sun, so expect bright colors to soften over a few seasons. Keep it out of the window line, or lean into the sun-faded look.`;
  if (room.facing === "north")
    return `North light is soft and cool, so warm tones will read a little muted by day. Your ${item} will glow under a warm bulb at night.`;
  if (level === "medium")
    return `Good light without much direct sun. Your ${item} should hold their color for years, with the most fading on the side facing the window.`;
  return `Gentle light, so your ${item} will keep their color for a long time. Deep shades may look darker than on screen, so add a lamp nearby.`;
}

/**
 * Estimate brightness and warmth from a room photo (on-device, no upload).
 * Returns a best guess for the questions the photo can answer.
 */
export function estimateFromPixels(data: Uint8ClampedArray): { brightness: Brightness; warmth: number } {
  let lum = 0, r = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 16) {
    lum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    r += data[i];
    b += data[i + 2];
    n++;
  }
  const avg = lum / n;
  const warmth = (r - b) / n / 255; // >0 warm, <0 cool
  return { brightness: avg < 85 ? "dim" : avg < 160 ? "bright" : "sunny", warmth: Math.round(warmth * 100) / 100 };
}

/** Compass heading (0 = north, clockwise) → nearest window facing. */
export function facingFromHeading(deg: number): Facing {
  const d = ((deg % 360) + 360) % 360;
  return (["north", "east", "south", "west"] as const)[Math.round(d / 90) % 4];
}

/**
 * Projected print fade after `years` in this light: 0 = like new, 1 = washed out.
 * An estimate for the lifecycle preview, not a lab measurement.
 */
const FADE_PER_YEAR = { low: 0.025, medium: 0.06, high: 0.11 } as const;
export function projectedFade(room: RoomLight, years: number): number {
  return Math.min(0.85, FADE_PER_YEAR[sunExposure(room)] * years);
}

/** CSS filter that simulates sun fading: colors desaturate, lift and warm slightly. */
export function fadeFilter(fade: number): string {
  return `saturate(${(1 - fade).toFixed(2)}) brightness(${(1 + fade * 0.18).toFixed(2)}) sepia(${(fade * 0.25).toFixed(2)}) contrast(${(1 - fade * 0.3).toFixed(2)})`;
}

/**
 * Sun-smart colorway: softer, less saturated and closer to mid-light. A different colorway
 * doesn't make fabric itself sun-proof, but fading shows far less on muted tones.
 */
export function sunSmartColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  let r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  let l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  s *= 0.5;
  l = l + (0.62 - l) * 0.35;
  const hue = (t: number) => {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    t = (t + 1) % 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  [r, g, b] = s === 0 ? [l, l, l] : [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)];
  return "#" + [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
}

/** Muted colorways show the same sun as roughly 40% less visible fading. */
export const SUN_SMART_FADE = 0.6;
