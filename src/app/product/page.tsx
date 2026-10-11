"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { formatPrice, type GeneratedProduct } from "@/lib/catalog";

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

export default function ProductPage() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const product = useMemo(() => (raw ? (JSON.parse(raw) as GeneratedProduct) : null), [raw]);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!product) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 text-center">
        <h1 className="font-display text-4xl">Nothing designed yet.</h1>
        <Link href="/design" className="mt-8 flex h-14 items-center justify-center rounded-full bg-ink font-semibold text-paper">
          Design something
        </Link>
      </main>
    );
  }

  async function buy() {
    setBuying(true);
    setError(null);
    try {
      const res = await fetch("/api/arcade/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product!.productId }),
      }).then((r) => r.json());
      if (!res.checkoutUrl) throw new Error(res.error ?? "Checkout is unavailable");
      window.location.href = res.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout is unavailable");
      setBuying(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Link href="/design" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-xl" aria-label="Back to design">
        ←
      </Link>
      <p className="mt-2 text-xs font-medium tracking-[0.2em] uppercase text-accent">
        {product.fallback ? "One we made earlier" : "Designed for you, just now"}
      </p>
      <h1 className="mt-2 font-display text-[2rem] leading-[1.05] tracking-tight">{product.title}</h1>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.imageUrl}
        alt={`${product.title}, made to order`}
        className="mt-5 aspect-square w-full rounded-2xl border-2 border-ink object-cover animate-develop"
      />

      <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Price</dt>
        <dd className="font-semibold text-ink">{formatPrice(product.price)}</dd>
        <dt className="text-muted">Size</dt>
        <dd>{product.selectionLabel || "Standard"}</dd>
        <dt className="text-muted">Made</dt>
        <dd>To order, just for you</dd>
      </dl>

      {error && (
        <p role="alert" className="mt-4 text-sm text-accent">
          {error}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-3 pt-8">
        <Link
          href="/room"
          className="flex h-14 items-center justify-center rounded-full border-2 border-ink text-base font-semibold transition-transform active:scale-[0.98]"
        >
          See it in my room
        </Link>
        <button
          type="button"
          onClick={buy}
          disabled={buying}
          className="flex h-14 items-center justify-center rounded-full bg-accent text-base font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {buying ? "Opening checkout…" : `Buy · ${formatPrice(product.price)}`}
        </button>
      </div>
    </main>
  );
}
