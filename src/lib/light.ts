/** Room light model: answers (or a photo estimate) → viewer lighting + one line of advice. */
export type WindowSize = "small" | "medium" | "wall";
export type Facing = "north" | "east" | "south" | "west";
export type Brightness = "dim" | "bright" | "sunny";

export type RoomLight = { windowSize: WindowSize; facing: Facing; brightness: Brightness; warmth?: number };

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
    wash: FACING_WASH[room.facing],
  };
}

/** Direct sun on fabric is what fades prints: south and west windows, big glass, sunny rooms. */
export function sunExposure(room: RoomLight): "low" | "medium" | "high" {
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
