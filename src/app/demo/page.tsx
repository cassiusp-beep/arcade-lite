"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveProduct, type GeneratedProduct } from "@/lib/catalog";
import { buildProfile, encodeProfile, saveProfile, type StyleProfile } from "@/lib/profile";
import { curatedVibe } from "@/lib/soundtrack";

/**
 * Filming hub: every feature in journey order, each opened with the state it needs and in demo
 * mode, so nothing waits on Arcade or Gemini. Not linked from the app; go to /demo directly.
 */

function demoProfile(): StyleProfile {
  // Matches the cached Arcade designs (the toile pillow and olive studs were made for this style).
  const base = buildProfile("sunlit-archivist", "midnight-scholar", [], new Date().toISOString());
  const vibe = curatedVibe("Frank Ocean, Clairo");
  return { ...base, soundtrack: { text: "Frank Ocean, Clairo", line: vibe.line, keywords: vibe.keywords } };
}

async function loadCached(file: string) {
  const p = (await fetch(file).then((r) => r.json())) as GeneratedProduct;
  saveProduct({ ...p, fallback: true });
}

/** setup may return a URL to open instead of href (e.g. a share link it just built). */
type Scene = { title: string; shows: string; href: string; setup?: () => Promise<string | void> | string | void; tip?: string };

const SCENES: Scene[] = [
  { title: "Landing", shows: "The promise: you have taste, let's name it.", href: "/" },
  { title: "Vibe check", shows: "10 real-life questions; the aura card builds with every answer.", href: "/quiz?demo=1", tip: "Answer 3 or 4, then tap Skip quiz." },
  { title: "Soundtrack", shows: "Type an artist; the aura absorbs the music.", href: "/quiz?demo=1&jump=music", tip: "Artists are prefilled. Tap Read it, then See my style." },
  {
    title: "Style profile reveal",
    shows: "The shareable card: name, palette, keywords, music line.",
    href: "",
    setup: () => {
      const p = demoProfile();
      saveProfile(p);
      return `/profile?p=${encodeProfile(p)}&new=1`;
    },
  },
  {
    title: "Design with Arcade (home)",
    shows: "Your profile becomes the Arcade prompt; pick a pillow.",
    href: "/design?demo=1",
    setup: () => saveProfile(demoProfile()),
    tip: "Pick Decorative Pillows, then Design. The cached design appears after a few seconds.",
  },
  {
    title: "The product",
    shows: "Real Arcade product photo, options and price.",
    href: "/product",
    setup: async () => {
      saveProfile(demoProfile());
      await loadCached("/demo/product.json");
    },
  },
  {
    title: "Your light + lifecycle + Make it last",
    shows: "Isometric room, compass, SunCalc sun hours, year 1/3/5 fade, Arcade recolor.",
    href: "/room?demo=1",
    setup: () => loadCached("/demo/product.json"),
    tip: "Answers are preset; tap Next through. On the last screen tap Make it last.",
  },
  {
    title: "3D + AR Quick Look",
    shows: "The pillow built from its real options, then placed in your room.",
    href: "/room?demo=1",
    setup: () => loadCached("/demo/product.json"),
    tip: "Tap Next to the last screen, scroll to the 3D view, tap View in your room.",
  },
  {
    title: "Design jewelry",
    shows: "Same profile, now something to wear.",
    href: "/design?demo=1",
    setup: () => saveProfile(demoProfile()),
    tip: "Pick Stud Earrings, then Design.",
  },
  {
    title: "Live face try-on",
    shows: "The real Arcade studs on you, live, with snap and share.",
    href: "/tryon?demo=1",
    tip: "Tap Turn on camera. Turn your head slowly to show tracking.",
  },
  { title: "In-store inspiration", shows: "Scan a barcode, snap a photo, steer the next design.", href: "/inspire", tip: "Creates a real Arcade reference." },
  {
    title: "Checkout",
    shows: "Buy opens Arcade's real checkout page.",
    href: "/product",
    setup: () => loadCached("/demo/product.json"),
    tip: "Tap Buy. Don't pay.",
  },
];

export default function DemoHub() {
  const router = useRouter();
  async function open(scene: Scene) {
    const target = (await scene.setup?.()) || scene.href;
    if (target) router.push(target);
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <p className="text-xs font-medium tracking-[0.2em] uppercase text-accent">Demo mode</p>
      <h1 className="mt-2 font-display text-[2.1rem] leading-[1.05] tracking-tight">Film it in order</h1>
      <p className="mt-2 text-muted">Each scene opens ready to go with cached Arcade designs, so nothing waits on a live API.</p>

      <ol className="mt-6 flex flex-col gap-3">
        {SCENES.map((scene, i) => (
          <li key={scene.title}>
            <button
              type="button"
              onClick={() => open(scene)}
              className="flex w-full items-start gap-4 rounded-2xl border-2 border-ink bg-white p-4 text-left transition active:scale-[0.98] active:shadow-none shadow-[4px_4px_0_var(--ink)]"
            >
              <span className="font-display text-3xl leading-none text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1">
                <span className="block font-semibold">{scene.title}</span>
                <span className="mt-0.5 block text-sm text-muted">{scene.shows}</span>
                {scene.tip && <span className="mt-1.5 block text-xs font-medium">▶ {scene.tip}</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => {
          try {
            localStorage.clear();
          } catch {}
          router.refresh();
        }}
        className="mt-6 h-12 text-sm text-muted underline underline-offset-4"
      >
        Reset everything (fresh start)
      </button>
      <Link href="/" className="h-11 text-center text-sm text-muted">
        Back to the app
      </Link>
    </main>
  );
}
