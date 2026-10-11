import SunCalc from "suncalc";
import type { Facing } from "./light";

/**
 * Direct-sun estimate for a window, computed on the device (lat/long never leave the phone).
 * Sun "enters" when it's above the horizon and within 80° of the direction the window faces.
 * A model, not a measurement: it ignores trees, buildings and overhangs.
 */
const FACING_BEARING: Record<Facing, number> = { north: 0, east: 90, south: 180, west: 270 };
const STEP_MIN = 10;
const MIN_ALTITUDE_DEG = 5;
const MAX_OFF_AXIS_DEG = 80;

/** SunCalc azimuth is radians from south, clockwise toward west; convert to a compass bearing. */
export function sunBearing(azimuthRad: number): number {
  return (((azimuthRad * 180) / Math.PI + 180) % 360 + 360) % 360;
}

function angleBetween(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function directSunHours(lat: number, lng: number, facing: Facing, day: Date): number {
  const start = new Date(day);
  start.setUTCHours(0, 0, 0, 0);
  let minutes = 0;
  for (let m = 0; m < 24 * 60; m += STEP_MIN) {
    const t = new Date(start.getTime() + m * 60_000);
    const pos = SunCalc.getPosition(t, lat, lng);
    const altitude = (pos.altitude * 180) / Math.PI;
    if (altitude > MIN_ALTITUDE_DEG && angleBetween(sunBearing(pos.azimuth), FACING_BEARING[facing]) < MAX_OFF_AXIS_DEG) minutes += STEP_MIN;
  }
  return minutes / 60;
}

/** Average over the 15th of every month: what the fabric sees across a year. */
export function yearlySunHours(lat: number, lng: number, facing: Facing, year = new Date().getFullYear()): number {
  let total = 0;
  for (let month = 0; month < 12; month++) total += directSunHours(lat, lng, facing, new Date(Date.UTC(year, month, 15)));
  return Math.round((total / 12) * 10) / 10;
}

export function exposureFromHours(hours: number): "low" | "medium" | "high" {
  return hours >= 4 ? "high" : hours >= 1.5 ? "medium" : "low";
}
