"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { IsoRoom } from "@/components/iso-room";
import { yearlySunHours } from "@/lib/sun";
import { ProductViewer, textureUrl } from "@/components/product-viewer";
import { formatPrice, saveProduct, type GeneratedProduct } from "@/lib/catalog";
import {
  estimateFromPixels,
  facingFromHeading,
  fadeFilter,
  SUN_SMART_FADE,
  lightAdvice,
  projectedFade,
  sunExposure,
  viewerLight,
  type Brightness,
  type Facing,
  type RoomLight,
} from "@/lib/light";

const KEY = "arcade-lite:product";
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
const read = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

const FACINGS: { id: Facing; label: string }[] = [
  { id: "north", label: "N" },
  { id: "east", label: "E" },
  { id: "south", label: "S" },
  { id: "west", label: "W" },
];
const BRIGHTNESS: { id: Brightness; label: string }[] = [
  { id: "dim", label: "Cozy dim" },
  { id: "bright", label: "Bright" },
  { id: "sunny", label: "Sun-drenched" },
];
const WALLS = [
  { hex: "#f4efe6", name: "Paper" },
  { hex: "#dfe7d6", name: "Sage" },
  { hex: "#f1d7c8", name: "Blush" },
  { hex: "#d6e2ef", name: "Sky" },
  { hex: "#3b3a4a", name: "Ink" },
  { hex: "#e8c98a", name: "Ochre" },
];
const SUN_LEVEL = { low: 0.25, medium: 0.55, high: 0.9 } as const;
const STEPS = ["place", "window", "light", "time", "walls", "lifecycle"] as const;
type Step = (typeof STEPS)[number];

const DEMO: { room: RoomLight; wall: string } = { room: { windowSize: "medium", facing: "west", brightness: "sunny" }, wall: "#dfe7d6" };
// When location is skipped (or in demo mode) we assume a sunny city and say so.
const ASSUMED_PLACE = { lat: 34.05, lng: -118.24, label: "Los Angeles (assumed)" };
const TIME_IN_SPACE = [
  { id: "lt1", label: "Under an hour", hours: 0.5 },
  { id: "1-3", label: "1 to 3 hours", hours: 2 },
  { id: "3-6", label: "3 to 6 hours", hours: 4.5 },
  { id: "most", label: "Most of the day", hours: 8 },
] as const;
type Place = { lat: number; lng: number; label: string };

type Compass = { state: "idle" } | { state: "reading"; heading: number | null } | { state: "unavailable"; reason: string };

export default function RoomPage() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const stored = useMemo(() => (raw ? (JSON.parse(raw) as GeneratedProduct) : null), [raw]);
  // "Make it last" swaps in the sun-smart version without a reload.
  const [override, setOverride] = useState<GeneratedProduct | null>(null);
  const product = override ?? stored;
  const [lasting, setLasting] = useState<{ state: "idle" | "recolor" | "build" | "error"; message?: string }>({ state: "idle" });
  const [step, setStep] = useState<Step>("place");
  const [place, setPlace] = useState<Place | null>(null);
  const [locating, setLocating] = useState<string | null>(null);
  const [timeIn, setTimeIn] = useState<(typeof TIME_IN_SPACE)[number]["id"]>("1-3");
  const [facing, setFacing] = useState<Facing | null>(null);
  const [brightness, setBrightness] = useState<Brightness>("bright");
  const [warmth, setWarmth] = useState<number | undefined>(undefined);
  const [wall, setWall] = useState(WALLS[0].hex);
  const [compass, setCompass] = useState<Compass>({ state: "idle" });
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const stopCompass = useRef<(() => void) | null>(null);
  // Sun math runs here, on the phone: lat/long are never sent anywhere.
  const sunHours = useMemo(() => (place && facing ? yearlySunHours(place.lat, place.lng, facing) : undefined), [place, facing]);

  // ?demo=1 presets every answer so the presenter just taps through.
  useEffect(() => {
    if (new URLSearchParams(location.search).get("demo") !== "1") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the URL on mount
    setPlace(ASSUMED_PLACE);
    setTimeIn("3-6");
    setFacing(DEMO.room.facing);
    setBrightness(DEMO.room.brightness);
    setWall(DEMO.wall);
  }, []);

  useEffect(() => () => stopCompass.current?.(), []);

  if (!product || !product.mesh) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 text-center">
        <h1 className="font-display text-4xl">Design something first.</h1>
        <Link href="/design" className="mt-8 flex h-14 items-center justify-center rounded-full bg-ink font-semibold text-paper">
          Design something
        </Link>
      </main>
    );
  }

  const room: RoomLight = { windowSize: "medium", facing: facing ?? "south", brightness, warmth, sunHours };
  const timeLabel = TIME_IN_SPACE.find((t) => t.id === timeIn)!.label.toLowerCase();
  const exposure = sunExposure(room);
  const sun = facing === "north" ? 0.15 : SUN_LEVEL[exposure];
  const stepIndex = STEPS.indexOf(step);
  const patternSrc = textureUrl(product.patternImageUrl);

  function locate() {
    if (!navigator.geolocation) return setLocating("Location isn't available here. We'll assume a sunny city.");
    setLocating("Finding you…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Round to ~1 km: plenty for sun angles, and less precise than they shared.
        setPlace({ lat: Math.round(pos.coords.latitude * 100) / 100, lng: Math.round(pos.coords.longitude * 100) / 100, label: "your location" });
        setLocating(null);
      },
      () => setLocating("Location was declined. We'll assume a sunny city; you can still tell us everything else."),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  }

  async function startCompass() {
    type IOSOrientation = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };
    const DOE = (typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : undefined) as IOSOrientation | undefined;
    if (!DOE) return setCompass({ state: "unavailable", reason: "No compass on this device. Tap a direction instead." });
    try {
      // iOS needs permission from a tap.
      if (typeof DOE.requestPermission === "function" && (await DOE.requestPermission()) !== "granted") {
        return setCompass({ state: "unavailable", reason: "Compass access was declined. Tap a direction instead." });
      }
    } catch {
      return setCompass({ state: "unavailable", reason: "Compass isn't available here. Tap a direction instead." });
    }
    setCompass({ state: "reading", heading: null });
    const onOrient = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      const heading = e.webkitCompassHeading ?? (e.absolute && e.alpha !== null ? 360 - e.alpha : null);
      if (heading !== null && heading !== undefined) setCompass({ state: "reading", heading });
    };
    const eventName = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    window.addEventListener(eventName, onOrient as EventListener);
    stopCompass.current = () => window.removeEventListener(eventName, onOrient as EventListener);
    setTimeout(() => setCompass((c) => (c.state === "reading" && c.heading === null ? { state: "unavailable", reason: "No compass reading. Tap a direction instead." } : c)), 2500);
  }

  function lockCompass() {
    if (compass.state !== "reading" || compass.heading === null) return;
    setFacing(facingFromHeading(compass.heading));
    stopCompass.current?.();
    setCompass({ state: "idle" });
  }

  async function readPhoto(file: File) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(bitmap, 0, 0, 64, 64);
    const est = estimateFromPixels(ctx.getImageData(0, 0, 64, 64).data);
    setBrightness(est.brightness);
    setWarmth(est.warmth);
    const tone = est.warmth > 0.08 ? "warm" : est.warmth < -0.03 ? "cool" : "neutral";
    setPhotoNote(`Measured ${BRIGHTNESS.find((b) => b.id === est.brightness)!.label.toLowerCase()}, ${tone} light. The photo stays on your phone.`);
  }

  /** Fade for year y, eased when the colorway is sun-smart (muted tones show fading less). */
  const fadeAt = (y: number) => projectedFade(room, y) * (product!.sunSmart ? SUN_SMART_FADE : 1);

  async function makeItLast() {
    const p = product!;
    const poll = async (jobId: string) => {
      for (;;) {
        await new Promise((r) => setTimeout(r, 3000));
        const j = await fetch(`/api/arcade/jobs/${jobId}`).then((r) => r.json()).catch(() => ({ status: "running" }));
        if (j.status !== "running") return j;
      }
    };
    try {
      setLasting({ state: "recolor" });
      if (new URLSearchParams(location.search).get("demo") === "1") {
        await new Promise((r) => setTimeout(r, 4000));
        const saved = (await fetch("/demo/product-sunsmart.json").then((r) => r.json())) as GeneratedProduct;
        saveProduct(saved);
        setOverride(saved);
        return setLasting({ state: "idle" });
      }
      const rc = await fetch("/api/arcade/recolor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patternId: p.patternId }) }).then((r) => r.json());
      if (!rc.jobId) throw new Error(rc.error ?? "Recolor didn't start");
      const pj = await poll(rc.jobId);
      if (!pj.pattern) throw new Error(pj.error ?? "Recolor failed");
      setLasting({ state: "build" });
      const pr = await fetch("/api/arcade/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternId: pj.pattern.patternId, categoryId: p.categoryId, selections: p.selections }),
      }).then((r) => r.json());
      if (!pr.jobId) throw new Error(pr.error ?? "Couldn't build the new version");
      const job = await poll(pr.jobId);
      if (job.status !== "succeeded") throw new Error(job.error ?? "Couldn't build the new version");
      const next: GeneratedProduct = { ...p, ...job.product, sunSmart: true, fallback: false };
      saveProduct(next);
      setOverride(next);
      setLasting({ state: "idle" });
    } catch (err) {
      setLasting({ state: "error", message: err instanceof Error ? err.message : "Something went wrong" });
    }
  }

  async function buy() {
    setBuying(true);
    const res = await fetch("/api/arcade/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product!.productId }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    if (res.checkoutUrl) window.location.href = res.checkoutUrl;
    else setBuying(false);
  }

  const canNext = step !== "window" || facing !== null;
  function next() {
    if (step === "place" && !place) setPlace(ASSUMED_PLACE);
    setStep(STEPS[stepIndex + 1]);
  }
  const item = product.categoryName.toLowerCase();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => (stepIndex === 0 ? history.back() : setStep(STEPS[stepIndex - 1]))}
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-xl"
          aria-label="Back"
        >
          ←
        </button>
        <div className="flex flex-1 gap-1.5" aria-label={`Step ${stepIndex + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <span key={s} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= stepIndex ? "bg-ink" : "bg-line"}`} />
          ))}
        </div>
      </header>

      {/* The room stays on screen and builds itself as you answer. */}
      <div className="sticky top-0 z-10 -mx-5 bg-paper/95 px-5 pt-2 pb-1 backdrop-blur">
        <IsoRoom facing={facing} sun={sun} wall={wall} patternUrl={patternSrc} productFilter={step === "lifecycle" ? fadeFilter(fadeAt(3)) : undefined} />
      </div>

      <section key={step} className="flex flex-1 flex-col pt-3 animate-rise">
        {step === "place" && (
          <>
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-accent">Location</p>
            <h1 className="mt-2 font-display text-[1.9rem] leading-[1.05] tracking-tight">Where is the space you&rsquo;re designing for?</h1>
            <p className="mt-2 text-muted">We use your location once to see where the sun hits your space. It never leaves your phone.</p>
            <button type="button" onClick={locate} className="mt-4 h-14 rounded-full bg-ink text-base font-semibold text-paper active:scale-[0.98]">
              {place?.label === "your location" ? "Got it ✓" : "Use my location once"}
            </button>
            {locating && <p className="mt-2 text-sm text-muted">{locating}</p>}
            {place?.label === "your location" && <p className="mt-2 text-sm">Sun angles set for where you are.</p>}
          </>
        )}

        {step === "time" && (
          <>
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-accent">Your days</p>
            <h1 className="mt-2 font-display text-[1.9rem] leading-[1.05] tracking-tight">How much time do you spend in this space?</h1>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {TIME_IN_SPACE.map((t) => (
                <Chip key={t.id} active={timeIn === t.id} onClick={() => setTimeIn(t.id)}>
                  {t.label}
                </Chip>
              ))}
            </div>
          </>
        )}

        {step === "window" && (
          <>
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-accent">Natural light</p>
            <h1 className="mt-2 font-display text-[1.9rem] leading-[1.05] tracking-tight">Which way does your window face?</h1>
            {compass.state === "reading" ? (
              <div className="mt-4 rounded-2xl bg-white p-4 text-center">
                <p className="text-sm text-muted">Hold your phone flat and point the top at your window.</p>
                <p className="mt-2 font-display text-4xl">
                  {compass.heading === null ? "…" : `${Math.round(compass.heading)}° ${facingFromHeading(compass.heading)[0].toUpperCase()}`}
                </p>
                <button type="button" onClick={lockCompass} disabled={compass.heading === null} className="mt-3 h-12 w-full rounded-full bg-ink font-semibold text-paper disabled:opacity-50">
                  That&rsquo;s my window
                </button>
              </div>
            ) : (
              <button type="button" onClick={startCompass} className="mt-4 h-14 rounded-full bg-ink text-base font-semibold text-paper active:scale-[0.98]">
                Use my phone&rsquo;s compass
              </button>
            )}
            {compass.state === "unavailable" && <p className="mt-2 text-sm text-muted">{compass.reason}</p>}
            <p className="mt-4 text-sm text-muted">Or tap it:</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {FACINGS.map((f) => (
                <Chip key={f.id} active={facing === f.id} onClick={() => setFacing(f.id)} label={`Window faces ${f.id}`}>
                  {f.label}
                </Chip>
              ))}
            </div>
          </>
        )}

        {step === "light" && (
          <>
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-accent">How much light</p>
            <h1 className="mt-2 font-display text-[1.9rem] leading-[1.05] tracking-tight">On a clear afternoon, it&rsquo;s…</h1>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {BRIGHTNESS.map((b) => (
                <Chip
                  key={b.id}
                  active={brightness === b.id}
                  onClick={() => {
                    setBrightness(b.id);
                    setWarmth(undefined);
                  }}
                >
                  {b.label}
                </Chip>
              ))}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && readPhoto(e.target.files[0])} />
            <button type="button" onClick={() => fileRef.current?.click()} className="mt-4 h-12 rounded-full border-2 border-ink text-sm font-semibold">
              Not sure? Snap the room and we&rsquo;ll measure it
            </button>
            {photoNote && <p className="mt-2 text-sm">{photoNote}</p>}
          </>
        )}

        {step === "walls" && (
          <>
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-accent">Wall color</p>
            <h1 className="mt-2 font-display text-[1.9rem] leading-[1.05] tracking-tight">What color are your walls?</h1>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {WALLS.map((w) => (
                <button
                  key={w.hex}
                  type="button"
                  onClick={() => setWall(w.hex)}
                  aria-pressed={wall === w.hex}
                  className={`flex h-16 items-end rounded-2xl border-2 p-2 text-xs font-semibold transition active:scale-[0.97] ${wall === w.hex ? "border-ink shadow-[3px_3px_0_var(--ink)]" : "border-line"}`}
                  style={{ background: w.hex, color: w.name === "Ink" ? "#fff" : "var(--ink)" }}
                >
                  {w.name}
                </button>
              ))}
            </div>
          </>
        )}

        {step === "lifecycle" && (
          <>
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-accent">Lifecycle of your {item}</p>
            <h1 className="mt-2 font-display text-[1.9rem] leading-[1.05] tracking-tight">How it ages in your light</h1>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[1, 3, 5].map((y) => (
                <figure key={y}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={patternSrc}
                    alt={`Your print after ${y} year${y > 1 ? "s" : ""}`}
                    className="aspect-square w-full rounded-xl border border-line object-cover transition-[filter] duration-500"
                    style={{ filter: fadeFilter(fadeAt(y)) }}
                  />
                  <figcaption className="mt-1 text-center text-xs font-medium">Year {y}</figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-3 rounded-2xl bg-white p-4 text-[0.95rem] leading-snug">
              <span className="font-semibold">In your light: </span>
              {lightAdvice(room, product.categoryName)}
            </p>
            {sunHours !== undefined && (
              <p className="mt-2 text-sm leading-snug">
                ☀️ About <span className="font-semibold">{sunHours} hours</span> of direct sun a day through a {room.facing}-facing window at {place!.label}, averaged
                over a year. You&rsquo;re in here {timeLabel}, so you&rsquo;ll really live with it.
              </p>
            )}
            <p className="mt-1 text-xs text-muted">A projection from sun angles and your answers, not a lab test. Trees and buildings can change it.</p>

            <div className="mt-4">
              <ProductViewer mesh={product.mesh!} patternUrl={product.patternImageUrl} selections={product.selections} light={viewerLight(room)} alt={product.title} />
            </div>
          </>
        )}

        <div className="mt-auto pt-6">
          {step === "lifecycle" ? (
            <div className="flex flex-col gap-2">
              {product.sunSmart ? (
                <p className="rounded-2xl border-2 border-ink bg-white p-3 text-sm leading-snug" aria-live="polite">
                  <span className="font-semibold">Sun-smart colorway ✓</span> Same {product.categoryName.toLowerCase()}, softer tones that show
                  fading far less in your light. Arcade recolored it just now.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={makeItLast}
                  disabled={lasting.state === "recolor" || lasting.state === "build"}
                  className="flex min-h-14 w-full flex-col items-center justify-center rounded-full border-2 border-ink px-4 py-2 text-base font-semibold active:scale-[0.98] disabled:opacity-60"
                >
                  {lasting.state === "recolor" ? "Softening your colors…" : lasting.state === "build" ? "Making it with your options…" : "Make it last"}
                  {lasting.state === "idle" && <span className="text-xs font-normal text-muted">A sun-smart colorway that shows fading less</span>}
                </button>
              )}
              {lasting.state === "error" && <p className="text-sm text-accent">{lasting.message}. Your original is still ready.</p>}
              <button
                type="button"
                onClick={buy}
                disabled={buying}
                className="flex h-14 w-full items-center justify-center rounded-full bg-accent text-base font-semibold text-white active:scale-[0.98] disabled:opacity-60"
              >
                {buying ? "Opening checkout…" : `${product.sunSmart ? "Buy the sun-smart one" : "Love it as is"} · ${formatPrice(product.price)}`}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!canNext}
              onClick={next}
              className="flex h-14 w-full items-center justify-center rounded-full bg-ink text-base font-semibold text-paper active:scale-[0.98] disabled:bg-line disabled:text-muted"
            >
              {!canNext ? "Pick a direction" : step === "place" && !place ? "Skip, assume a sunny city" : "Next"}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function Chip({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={`h-12 rounded-full border px-3 text-sm font-semibold transition active:scale-[0.97] ${active ? "border-ink bg-ink text-paper" : "border-line bg-white"}`}
    >
      {children}
    </button>
  );
}
