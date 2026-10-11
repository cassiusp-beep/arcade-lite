"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ProductViewer } from "@/components/product-viewer";
import { formatPrice, type GeneratedProduct } from "@/lib/catalog";
import { estimateFromPixels, lightAdvice, viewerLight, type Brightness, type Facing, type RoomLight, type WindowSize } from "@/lib/light";

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

const SIZES: { id: WindowSize; label: string }[] = [
  { id: "small", label: "Small" },
  { id: "medium", label: "Regular" },
  { id: "wall", label: "Wall of glass" },
];
const FACINGS: { id: Facing; label: string }[] = [
  { id: "north", label: "North" },
  { id: "east", label: "East" },
  { id: "south", label: "South" },
  { id: "west", label: "West" },
];
const BRIGHTNESS: { id: Brightness; label: string }[] = [
  { id: "dim", label: "Cozy dim" },
  { id: "bright", label: "Bright" },
  { id: "sunny", label: "Sun-drenched" },
];

export default function RoomPage() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const product = useMemo(() => (raw ? (JSON.parse(raw) as GeneratedProduct) : null), [raw]);
  const [room, setRoom] = useState<RoomLight>({ windowSize: "medium", facing: "south", brightness: "bright" });
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const light = viewerLight(room);

  if (!product) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 text-center">
        <h1 className="font-display text-4xl">Design something first.</h1>
        <Link href="/design" className="mt-8 flex h-14 items-center justify-center rounded-full bg-ink font-semibold text-paper">
          Design something
        </Link>
      </main>
    );
  }

  async function readPhoto(file: File) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(bitmap, 0, 0, 64, 64);
    const { brightness, warmth } = estimateFromPixels(ctx.getImageData(0, 0, 64, 64).data);
    setRoom((r) => ({ ...r, brightness, warmth }));
    const tone = warmth > 0.08 ? "warm" : warmth < -0.03 ? "cool" : "neutral";
    setPhotoNote(`From your photo: ${BRIGHTNESS.find((b) => b.id === brightness)!.label.toLowerCase()}, ${tone} light.`);
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

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Link href="/product" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-xl" aria-label="Back to product">
        ←
      </Link>
      <p className="mt-2 text-xs font-medium tracking-[0.2em] uppercase text-accent">Your room, your light</p>
      <h1 className="mt-2 font-display text-[2rem] leading-[1.05] tracking-tight">How will it look at home?</h1>

      <div className="mt-5">
        <ProductViewer mesh={product.mesh} patternUrl={product.patternImageUrl} light={light} alt={product.title} />
      </div>

      <p className="mt-4 rounded-2xl bg-white p-4 text-[0.95rem] leading-snug" aria-live="polite">
        <span className="font-semibold">In your light: </span>
        {lightAdvice(room, product.categoryName)}
      </p>

      <Question label="Your main window">
        {SIZES.map((o) => (
          <Chip key={o.id} active={room.windowSize === o.id} onClick={() => setRoom({ ...room, windowSize: o.id })}>
            {o.label}
          </Chip>
        ))}
      </Question>
      <Question label="It faces">
        {FACINGS.map((o) => (
          <Chip key={o.id} active={room.facing === o.id} onClick={() => setRoom({ ...room, facing: o.id })}>
            {o.label}
          </Chip>
        ))}
      </Question>
      <Question label="On a clear afternoon it's">
        {BRIGHTNESS.map((o) => (
          <Chip key={o.id} active={room.brightness === o.id} onClick={() => setRoom({ ...room, brightness: o.id })}>
            {o.label}
          </Chip>
        ))}
      </Question>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && readPhoto(e.target.files[0])} />
      <button type="button" onClick={() => fileRef.current?.click()} className="mt-5 flex h-12 items-center justify-center rounded-full border border-ink text-sm font-semibold">
        Not sure? Snap your room and we&rsquo;ll read the light
      </button>
      {photoNote && <p className="mt-2 text-center text-sm text-muted">{photoNote} Photo stays on your phone.</p>}

      <button
        type="button"
        onClick={buy}
        disabled={buying}
        className="mt-8 flex h-14 items-center justify-center rounded-full bg-accent text-base font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {buying ? "Opening checkout…" : `Love it · Buy for ${formatPrice(product.price)}`}
      </button>
    </main>
  );
}

function Question({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-5">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-11 rounded-full border px-4 text-sm font-medium transition active:scale-[0.97] ${active ? "border-ink bg-ink text-paper" : "border-line bg-white"}`}
    >
      {children}
    </button>
  );
}
