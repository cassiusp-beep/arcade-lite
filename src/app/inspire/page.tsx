"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BarcodeScanner, barcodeFromPhoto } from "@/components/barcode-scanner";
import { loadInspirations, saveInspirations, type Inspiration } from "@/lib/inspiration";

/** Downscale to a 1024px JPEG so uploads stay small and fast on cell data. */
async function shrink(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), "image/jpeg", 0.82));
  // Small thumbnail for the board, so localStorage doesn't overflow.
  const thumb = document.createElement("canvas");
  const t = 160 / Math.max(canvas.width, canvas.height);
  thumb.width = Math.round(canvas.width * t);
  thumb.height = Math.round(canvas.height * t);
  thumb.getContext("2d")!.drawImage(canvas, 0, 0, thumb.width, thumb.height);
  return { blob, dataUrl: thumb.toDataURL("image/jpeg", 0.7) };
}

export default function InspirePage() {
  const [items, setItems] = useState<Inspiration[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [product, setProduct] = useState<string | null>(null);
  const onCode = useCallback(async (c: string) => {
    setScanning(false);
    setCode(c);
    const hit = await fetch(`/api/barcode?code=${c}`).then((r) => r.json()).catch(() => null);
    setProduct(hit?.title ?? null);
  }, []);
  const photoRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
  useEffect(() => setItems(loadInspirations()), []);

  function persist(next: Inspiration[]) {
    setItems(next);
    saveInspirations(next);
  }

  async function addPhoto(file: File) {
    setError(null);
    setBusy("Reading the tag…");
    try {
      const scanned = code.replace(/\D/g, "") || (await barcodeFromPhoto(file));
      const lookup = scanned ? await fetch(`/api/barcode?code=${scanned}`).then((r) => r.json()).catch(() => null) : null;
      setBusy("Saving to your inspiration…");
      const { blob, dataUrl } = await shrink(file);
      const form = new FormData();
      form.append("photo", blob, "inspiration.jpg");
      const ref = await fetch("/api/arcade/reference", { method: "POST", body: form }).then((r) => r.json());
      if (!ref.referenceId) throw new Error(ref.error ?? "Couldn't save that photo");
      const label = lookup?.title ? String(lookup.title).slice(0, 80) : "something I loved in a store";
      persist([
        { id: crypto.randomUUID(), label, barcode: scanned ?? undefined, photoDataUrl: dataUrl, referenceId: ref.referenceId, savedAt: new Date().toISOString() },
        ...items,
      ].slice(0, 12));
      setCode("");
      setProduct(null);
    } catch (err) {
      setError(err instanceof TypeError ? "Lost connection while saving. Try again?" : err instanceof Error ? err.message : "Couldn't save that photo");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Link href="/design" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-xl" aria-label="Back to design">
        ←
      </Link>
      <p className="mt-2 text-xs font-medium tracking-[0.2em] uppercase text-accent">In-store inspiration</p>
      <h1 className="mt-2 font-display text-[2rem] leading-[1.05] tracking-tight">Saw something you love?</h1>
      <p className="mt-3 text-muted">
        Snap it, tag and all. Your next design borrows its colors and motifs.
      </p>

      <div className="mt-6 flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="code" className="block text-sm font-medium">
            Barcode <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="code"
            inputMode="numeric"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setProduct(null);
            }}
            placeholder="Scan or type it"
            className="mt-2 h-12 w-full rounded-xl border border-line bg-white px-4 text-base outline-none focus:border-ink"
          />
        </div>
        <button type="button" onClick={() => setScanning(true)} className="h-12 rounded-xl border-2 border-ink px-4 text-sm font-semibold">
          Scan
        </button>
      </div>
      {product && <p className="mt-2 text-sm"><span className="text-muted">Found:</span> {product}</p>}
      {scanning && <BarcodeScanner onCode={onCode} onClose={() => setScanning(false)} />}

      <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && addPhoto(e.target.files[0])} />
      <button
        type="button"
        disabled={Boolean(busy)}
        onClick={() => photoRef.current?.click()}
        className="mt-4 flex h-14 items-center justify-center rounded-full bg-ink text-base font-semibold text-paper transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {busy ?? "Snap it"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-accent">
          {error}
        </p>
      )}

      {items.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium">Your inspiration ({items.length})</h2>
          <ul className="mt-3 grid grid-cols-3 gap-3">
            {items.map((item) => (
              <li key={item.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.photoDataUrl} alt={item.label} className="aspect-square w-full rounded-xl border border-line object-cover" />
                <p className="mt-1 line-clamp-2 text-xs text-muted">{item.label}</p>
                <button
                  type="button"
                  onClick={() => persist(items.filter((i) => i.id !== item.id))}
                  className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm"
                  aria-label={`Remove ${item.label}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">Each design you make borrows from your newest three.</p>
        </section>
      )}

      <Link
        href="/design"
        className="mt-auto flex h-14 items-center justify-center rounded-full bg-accent text-base font-semibold text-white"
      >
        Design with my inspiration
      </Link>
    </main>
  );
}
