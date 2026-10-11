"use client";

import { animate } from "animejs";
import { useEffect, useRef } from "react";

type Props = { colors: string[]; keywords: string[]; answered: number; total: number; music?: boolean };

/** Live "aura" that builds as the shopper answers: layered color glows plus keyword stickers. */
export function AuraCard({ colors, keywords, answered, total, music }: Props) {
  const orbRef = useRef<HTMLDivElement>(null);
  const stickersRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!colors.length) return;
    if (orbRef.current) animate(orbRef.current, { scale: [0.94, 1], duration: 300, ease: "outBack" });
    const last = stickersRef.current?.lastElementChild;
    if (last) animate(last, { opacity: [0, 1], scale: [1.4, 1], rotate: [-12, (keywords.length % 2 ? 1 : -1) * 4], duration: 300, ease: "outBack" });
  }, [colors.length, keywords.length]);

  // Each answer adds a glow at its own spot, so the aura reads like a mood board, not a gradient.
  const spots = ["20% 30%", "75% 25%", "55% 70%", "15% 80%", "85% 75%", "40% 15%", "65% 45%", "30% 55%", "90% 45%", "50% 90%"];
  const background = colors.length
    ? colors.map((c, i) => `radial-gradient(circle at ${spots[i % spots.length]}, ${c} 0, ${c}00 55%)`).join(", ") + ", var(--paper)"
    : "repeating-linear-gradient(45deg, var(--line) 0 2px, transparent 2px 10px), var(--paper)";

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-ink" aria-live="polite">
      <div ref={orbRef} className="h-28 w-full transition-[background] duration-300" style={{ background, filter: colors.length ? "saturate(1.15) blur(0.5px)" : undefined }} />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-2 text-[0.7rem] font-semibold tracking-[0.15em] uppercase">
        <span className="rounded-full bg-paper/85 px-2 py-0.5">Your aura</span>
        <span className="rounded-full bg-paper/85 px-2 py-0.5">
          {answered}/{total}
          {music && " + 🎧"}
        </span>
      </div>
      <ul ref={stickersRef} className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 px-3 pb-2">
        {keywords.slice(-5).map((k, i) => (
          <li key={`${k}-${i}`} className="rounded-full border border-ink bg-white px-2 py-0.5 text-xs font-semibold shadow-[2px_2px_0_var(--ink)]">
            {k}
          </li>
        ))}
        {!keywords.length && <li className="text-xs text-muted">Answer to start your aura</li>}
      </ul>
    </div>
  );
}
