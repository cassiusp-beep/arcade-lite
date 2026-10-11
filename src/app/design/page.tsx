"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { buildPrompt, saveProduct, type CatalogItem, type GeneratedProduct } from "@/lib/catalog";
import { loadInspirations } from "@/lib/inspiration";
import { parseProfile, readProfileRaw, subscribeProfile } from "@/lib/profile";

type Phase = { kind: "pick" } | { kind: "generating"; startedAt: number } | { kind: "error"; message: string };

const POLL_MS = 3000;
const GIVE_UP_MS = 4 * 60 * 1000;
const STATUS_LINES = [
  "Reading your palette…",
  "Sketching motifs in your style…",
  "Testing it at full scale…",
  "Sending it to the maker…",
  "Pricing your one-of-a-kind…",
];

export default function DesignPage() {
  const router = useRouter();
  const raw = useSyncExternalStore(subscribeProfile, readProfileRaw, () => null);
  const profile = useMemo(() => parseProfile(raw), [raw]);
  const [catalog, setCatalog] = useState<CatalogItem[] | null>(null);
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [idea, setIdea] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "pick" });
  const [tick, setTick] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    // Reset on every mount: Next keeps hidden pages alive and re-runs effects when you come back.
    cancelled.current = false;
    fetch("/api/arcade/categories")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setCatalog(d.items))
      .catch(() => setCatalog([]));
    return () => {
      cancelled.current = true;
    };
  }, []);

  useEffect(() => {
    if (phase.kind !== "generating") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [phase.kind]);

  async function finish(product: Omit<GeneratedProduct, "categoryName" | "mesh" | "prompt">, item: CatalogItem, prompt: string) {
    saveProduct({ ...product, categoryName: item.name, mesh: item.mesh, world: item.world, prompt });
    router.push("/product");
  }

  async function showSaved() {
    const res = await fetch(selected?.world === "jewelry" ? "/demo/jewelry.json" : "/demo/product.json");
    if (!res.ok) return setPhase({ kind: "error", message: "Arcade is slow right now and there's no saved design yet. Try again in a minute." });
    const saved = (await res.json()) as GeneratedProduct;
    saveProduct({ ...saved, fallback: true });
    router.push("/product");
  }

  async function generate() {
    if (!profile || !selected) return;
    // ?demo=1: play the generating screen briefly, then show the cached design (never stalls on stage).
    if (new URLSearchParams(location.search).get("demo") === "1") {
      setTick(0);
      setPhase({ kind: "generating", startedAt: Date.now() });
      await new Promise((r) => setTimeout(r, 6000));
      return showSaved();
    }
    const inspirations = loadInspirations().slice(0, 3);
    const prompt = buildPrompt(profile, selected.name, idea, inspirations.map((i) => i.label), selected.world);
    const startedAt = Date.now();
    setTick(0);
    setPhase({ kind: "generating", startedAt });
    try {
      const start = await fetch("/api/arcade/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          categoryId: selected.categoryId,
          world: selected.world,
          referenceIds: inspirations.flatMap((i) => (i.referenceId ? [i.referenceId] : [])),
        }),
      }).then((r) => r.json());
      if (!start.jobId) throw new Error(start.error ?? "Couldn't start the design");

      while (!cancelled.current) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        // A dropped request (backgrounded tab, flaky cell signal) just means "ask again".
        const job = await fetch(`/api/arcade/jobs/${start.jobId}`)
          .then((r) => r.json())
          .catch(() => ({ status: "running" }));
        if (job.status === "succeeded") return finish(job.product, selected, prompt);
        if (job.status === "failed" || job.error) throw new Error(job.error ?? "Generation failed");
        if (Date.now() - startedAt > GIVE_UP_MS) throw new Error("Arcade is taking longer than usual.");
      }
    } catch (err) {
      const offline = err instanceof TypeError; // Safari reports network drops as "Load failed"
      setPhase({
        kind: "error",
        message: offline ? "We lost the connection to Arcade for a second." : err instanceof Error ? err.message : "Something broke while designing.",
      });
    }
  }

  if (!profile) {
    return (
      <Shell>
        <div className="flex flex-1 flex-col justify-center text-center">
          <h1 className="font-display text-4xl">First, your style.</h1>
          <p className="mt-3 text-muted">We design from your profile, so take the 1-minute quiz.</p>
          <Link href="/quiz" className="mt-8 flex h-14 items-center justify-center rounded-full bg-ink font-semibold text-paper">
            Find my style
          </Link>
        </div>
      </Shell>
    );
  }

  if (phase.kind === "generating") {
    const seconds = tick;
    return (
      <Shell>
        <div className="flex flex-1 flex-col justify-center" aria-live="polite">
          <div className="flex h-24 overflow-hidden rounded-2xl border-2 border-ink">
            {profile.palette.map((s, i) => (
              <div key={s.hex} className="flex-1 animate-pulse" style={{ background: s.hex, animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
          <p className="mt-8 text-xs font-medium tracking-[0.2em] uppercase text-accent">Designing your {selected?.name.toLowerCase()}</p>
          <h1 className="mt-3 font-display text-3xl leading-tight">{STATUS_LINES[Math.floor(tick / 6) % STATUS_LINES.length]}</h1>
          <p className="mt-3 text-muted">
            Usually a minute or two · {seconds}s
          </p>
          {seconds > 45 && (
            <button type="button" onClick={() => showSaved()} className="mt-8 text-left text-sm underline underline-offset-4">
              In a hurry? Show one we made earlier
            </button>
          )}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted">Designing as a {profile.styleName}</p>
      <h1 className="mt-3 font-display text-[2.1rem] leading-[1.05] tracking-tight">What should we make you?</h1>

      {phase.kind === "error" && (
        <div role="alert" className="mt-5 rounded-2xl border-2 border-accent bg-white p-4">
          <p className="font-medium">{phase.message}</p>
          <div className="mt-3 flex gap-4 text-sm">
            <button type="button" className="underline underline-offset-4" onClick={generate}>
              Try again
            </button>
            <button type="button" className="underline underline-offset-4" onClick={() => showSaved()}>
              Show one we made earlier
            </button>
          </div>
        </div>
      )}

      {catalog === null && (
        <ul className="mt-6 grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="h-40 animate-pulse rounded-2xl bg-line" />
          ))}
        </ul>
      )}
      {(["print", "jewelry"] as const).map((world) => {
        const items = catalog?.filter((i) => i.world === world) ?? [];
        if (!items.length) return null;
        return (
          <section key={world} className="mt-6">
            <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted">{world === "print" ? "For your space" : "To wear"}</h2>
            <ul className="mt-3 grid grid-cols-2 gap-3">
              {items.map((item) => {
                const active = selected?.categoryId === item.categoryId;
                return (
                  <li key={item.categoryId}>
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      aria-pressed={active}
                      className={`flex h-full w-full flex-col overflow-hidden rounded-2xl border-2 bg-white text-left transition active:scale-[0.98] ${active ? "border-ink shadow-[4px_4px_0_var(--ink)]" : "border-line"}`}
                    >
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                      ) : (
                        <span
                          aria-hidden
                          className="flex aspect-[4/3] w-full items-center justify-center text-4xl"
                          style={{ background: `linear-gradient(135deg, ${profile.palette[0].hex}, ${profile.palette[2].hex})` }}
                        >
                          {item.emoji}
                        </span>
                      )}
                      <span className="px-3 pt-2 font-medium leading-tight">{item.name}</span>
                      <span className="px-3 pb-3 text-xs text-muted">{item.blurb}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {catalog?.length === 0 && (
        <p className="mt-4 text-sm text-muted">
          Couldn&rsquo;t reach Arcade&rsquo;s catalog.{" "}
          <button type="button" className="underline" onClick={() => showSaved()}>
            See a saved design
          </button>
        </p>
      )}

      <Link href="/inspire" className="mt-5 flex min-h-12 items-center justify-between rounded-2xl border border-dashed border-ink px-4 py-3 text-sm">
        <span>
          <span className="font-semibold">Saw something in a store?</span> Snap it to steer your design
        </span>
        <span aria-hidden>→</span>
      </Link>

      <label className="mt-6 block text-sm font-medium" htmlFor="idea">
        Anything specific? <span className="font-normal text-muted">(optional)</span>
      </label>
      <input
        id="idea"
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        maxLength={140}
        placeholder="e.g. lemons, my dog, a Lisbon tile"
        className="mt-2 h-12 w-full rounded-xl border border-line bg-white px-4 text-base outline-none focus:border-ink"
      />

      <div className="sticky bottom-0 -mx-5 mt-6 bg-paper/95 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <button
          type="button"
          disabled={!selected}
          onClick={generate}
          className="flex h-14 w-full items-center justify-center rounded-full bg-accent text-base font-semibold text-white transition active:scale-[0.98] disabled:bg-line disabled:text-muted"
        >
          {selected ? `Design my ${selected.name.toLowerCase()}` : "Pick something to design"}
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <Link href="/profile" className="mb-4 -ml-2 flex h-11 w-11 items-center justify-center rounded-full text-xl" aria-label="Back to my style card">
        ←
      </Link>
      {children}
    </main>
  );
}
