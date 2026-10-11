"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { encodeProfile, parseProfile, readProfileRaw, subscribeProfile, type StyleProfile } from "@/lib/profile";
import { ARCHETYPES } from "@/lib/quiz/archetypes";

type Props = { shared: StyleProfile | null; code: string | null; isNew: boolean };

export function ProfileView({ shared, code, isNew }: Props) {
  const [copied, setCopied] = useState(false);
  // localStorage is client-only; the server snapshot is null.
  const ownRaw = useSyncExternalStore(subscribeProfile, readProfileRaw, () => null);
  const own = useMemo(() => parseProfile(ownRaw), [ownRaw]);
  // No share code in the URL: fall back to the profile saved on this device.
  const profile = shared ?? own;
  const ownedCode = own ? encodeProfile(own) : null;

  if (!profile) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 text-center">
        <h1 className="font-display text-4xl">No style on file yet.</h1>
        <p className="mt-3 text-muted">Take the quiz and we&rsquo;ll name it.</p>
        <Link href="/quiz" className="mt-8 flex h-14 items-center justify-center rounded-full bg-ink font-semibold text-paper">
          Find my style
        </Link>
      </main>
    );
  }

  const shareCode = code ?? encodeProfile(profile);
  const secondary = ARCHETYPES[profile.secondaryId];
  // A visitor opening someone else's link sees "their" style, not "your" style.
  const isOwner = isNew || !shared || ownedCode === shareCode;

  async function share() {
    const url = `${location.origin}/profile?p=${shareCode}`;
    const text = `I'm a ${profile!.styleName}. What's your style?`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Arcade Lite", text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // User dismissed the share sheet; nothing to do.
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted">
        {isOwner ? "Your style, officially" : "Someone shared their style"}
      </p>

      <article
        className="relative mt-6 rounded-2xl border-2 border-ink bg-white p-6 shadow-[6px_6px_0_var(--ink)] animate-develop"
        aria-label={`Style profile: ${profile.styleName}`}
      >
        <p className="text-sm text-muted">{isOwner ? "You're a" : "They're a"}</p>
        <h1 className="mt-1 font-display text-[2.6rem] leading-[0.95] tracking-tight">{profile.styleName}</h1>
        <p className="mt-3 text-[1.05rem] leading-snug">{profile.tagline}</p>

        <div className="mt-6 flex h-20 overflow-hidden rounded-xl border border-line">
          {profile.palette.map((swatch) => (
            <div key={swatch.hex} className="flex flex-1 items-end p-1.5" style={{ background: swatch.hex }} title={`${swatch.name} ${swatch.hex}`}>
              <span className="sr-only">{swatch.name}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{profile.palette.map((s) => s.name).join(" · ")}</p>

        <ul className="mt-5 flex flex-wrap gap-2">
          {profile.keywords.map((k) => (
            <li key={k} className="rounded-full border border-ink px-3 py-1 text-sm font-medium">
              {k}
            </li>
          ))}
        </ul>

        <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
          With a streak of <span className="font-medium text-ink">{secondary.name}</span>.
        </p>
      </article>

      <div className="mt-auto flex flex-col gap-3 pt-8">
        {isOwner ? (
          <>
            <Link
              href="/design"
              className="flex h-14 items-center justify-center rounded-full bg-accent text-base font-semibold text-white transition-transform active:scale-[0.98]"
            >
              Design something in my style
            </Link>
            <button
              type="button"
              onClick={share}
              className="flex h-14 items-center justify-center rounded-full border-2 border-ink text-base font-semibold transition-transform active:scale-[0.98]"
            >
              {copied ? "Link copied" : "Share my card"}
            </button>
            <Link href="/quiz" className="flex h-11 items-center justify-center text-sm text-muted underline underline-offset-4">
              Retake the quiz
            </Link>
          </>
        ) : (
          <Link href="/quiz" className="flex h-14 items-center justify-center rounded-full bg-ink text-base font-semibold text-paper">
            Find my style
          </Link>
        )}
      </div>
    </main>
  );
}
