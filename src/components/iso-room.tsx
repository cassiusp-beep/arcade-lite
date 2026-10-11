"use client";

import { animate } from "animejs";
import { useEffect, useId, useRef } from "react";
import type { Facing } from "@/lib/light";

/** Which parts of the room have been "answered" so far; the room builds up as these fill in. */
export type IsoRoomState = {
  facing: Facing | null;
  /** 0 (no direct sun) to 1 (strong sun), drives the sun patch. */
  sun: number;
  wall: string;
  patternUrl: string;
  /** CSS filter applied to the product (lifecycle fade). */
  productFilter?: string;
};

// Isometric geometry (viewBox 320 x 250): back-left wall, back-right wall, floor diamond.
const FLOOR = "160,112 292,178 160,244 28,178";
const LEFT_WALL = "28,178 160,112 160,8 28,74";
const RIGHT_WALL = "160,112 292,178 292,74 160,8";
const WINDOW = "70,128 120,103 120,52 70,77"; // on the left wall
const SUN_PATCH = "70,128 120,103 214,170 160,198";
const RAY = "70,77 120,52 214,170 160,198";

const FACING_LABEL: Record<Facing, string> = { north: "N", east: "E", south: "S", west: "W" };
// Sun color by window direction: cool north light, golden west afternoons.
const SUN_COLOR: Record<Facing, string> = { north: "#cfe0ff", east: "#ffe6b0", south: "#fff1c4", west: "#ffb46b" };

export function IsoRoom({ facing, sun, wall, patternUrl, productFilter }: IsoRoomState) {
  const id = useId().replace(/:/g, "");
  const windowRef = useRef<SVGGElement>(null);
  const sunRef = useRef<SVGGElement>(null);
  const wallsRef = useRef<SVGGElement>(null);
  const productRef = useRef<SVGGElement>(null);

  // Window pops in on its wall when a direction is chosen; the sun ray sweeps in after it.
  useEffect(() => {
    if (!windowRef.current || !sunRef.current) return;
    if (!facing) {
      windowRef.current.style.opacity = "0";
      sunRef.current.style.opacity = "0";
      return;
    }
    animate(windowRef.current, { opacity: [0, 1], scale: [0.6, 1], duration: 300, ease: "outBack" });
    animate(sunRef.current, { opacity: [0, Math.max(0.15, sun)], translateX: [-24, 0], translateY: [-12, 0], duration: 650, delay: 150, ease: "outQuad" });
  }, [facing, sun]);

  useEffect(() => {
    if (!wallsRef.current) return;
    animate(wallsRef.current.querySelectorAll("polygon"), { fill: wall, duration: 300, ease: "outQuad" });
  }, [wall]);

  useEffect(() => {
    if (productRef.current) animate(productRef.current, { translateY: [-30, 0], opacity: [0, 1], duration: 450, ease: "outBounce" });
  }, [patternUrl]);

  const sunColor = facing ? SUN_COLOR[facing] : "#fff1c4";

  return (
    <svg viewBox="0 0 320 250" className="h-auto w-full" role="img" aria-label={facing ? `Your room, window facing ${facing}` : "Your room"}>
      <defs>
        <pattern id={`${id}-print`} patternUnits="objectBoundingBox" width="1" height="1">
          <image href={patternUrl} width="64" height="64" preserveAspectRatio="xMidYMid slice" />
        </pattern>
        <linearGradient id={`${id}-ray`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={sunColor} stopOpacity="0.9" />
          <stop offset="1" stopColor={sunColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      <g ref={wallsRef}>
        <polygon points={LEFT_WALL} fill={wall} stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points={RIGHT_WALL} fill={wall} stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" style={{ filter: "brightness(0.9)" }} />
      </g>
      <polygon points={FLOOR} fill="#e9dcc6" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" />

      <g ref={sunRef} style={{ opacity: 0, mixBlendMode: "multiply" }}>
        <polygon points={RAY} fill={`url(#${id}-ray)`} opacity="0.55" />
        <polygon points={SUN_PATCH} fill={sunColor} />
      </g>

      <g ref={windowRef} style={{ opacity: 0, transformBox: "fill-box", transformOrigin: "center" }}>
        <polygon points={WINDOW} fill="#bfe3ff" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
        <line x1="95" y1="115.5" x2="95" y2="64.5" stroke="var(--ink)" strokeWidth="1.5" />
        <line x1="70" y1="102.5" x2="120" y2="77.5" stroke="var(--ink)" strokeWidth="1.5" />
        {facing && (
          <g transform="translate(95 34)">
            <circle r="11" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.5" />
            <text textAnchor="middle" dy="4" fontSize="11" fontWeight="700" fill="var(--ink)">
              {FACING_LABEL[facing]}
            </text>
          </g>
        )}
      </g>

      {/* The product: an isometric cushion wearing the actual Arcade print. */}
      <g ref={productRef} style={{ filter: productFilter, transition: "filter 400ms ease-out" }}>
        <ellipse cx="200" cy="196" rx="34" ry="11" fill="var(--ink)" opacity="0.12" />
        <polygon points="170,186 206,168 232,181 196,199" fill={`url(#${id}-print)`} stroke="var(--ink)" strokeWidth="1.2" />
        <polygon points="170,186 196,199 196,190 170,177" fill={`url(#${id}-print)`} stroke="var(--ink)" strokeWidth="1.2" style={{ filter: "brightness(0.85)" }} />
        <polygon points="196,199 232,181 232,172 196,190" fill={`url(#${id}-print)`} stroke="var(--ink)" strokeWidth="1.2" style={{ filter: "brightness(0.75)" }} />
        <polygon points="170,177 206,159 232,172 196,190" fill={`url(#${id}-print)`} stroke="var(--ink)" strokeWidth="1.2" />
      </g>
    </svg>
  );
}
