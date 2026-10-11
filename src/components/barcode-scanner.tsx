"use client";

import { useEffect, useRef, useState } from "react";

type Props = { onCode: (code: string) => void; onClose: () => void };

/** Full-screen live camera scanner for product barcodes (UPC/EAN), via zxing. Works in iOS Safari. */
export function BarcodeScanner({ onCode, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let done = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current!,
          (result) => {
            const text = result?.getText();
            if (text && !done && /^\d{8,14}$/.test(text)) {
              done = true;
              controls.stop();
              navigator.vibrate?.(30);
              onCode(text);
            }
          },
        );
        stop = () => controls.stop();
      } catch {
        setError("We couldn't open the camera. Check camera access for Safari, or type the number instead.");
      }
    })();
    return () => stop?.();
  }, [onCode]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink text-paper" role="dialog" aria-label="Scan a barcode">
      <video ref={videoRef} className="h-full w-full flex-1 object-cover" playsInline muted />
      <div className="pointer-events-none absolute inset-x-10 top-1/2 h-28 -translate-y-1/2 rounded-2xl border-2 border-paper/90" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 bg-ink/80 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="text-center text-sm">{error ?? "Line up the barcode on the tag"}</p>
        <button type="button" onClick={onClose} className="mt-3 flex h-12 w-full items-center justify-center rounded-full border border-paper font-semibold">
          {error ? "Close" : "Cancel"}
        </button>
      </div>
    </div>
  );
}

/** Read a barcode from a still photo. Uses the native detector when present, else zxing. */
export async function barcodeFromPhoto(file: File): Promise<string | null> {
  const native = (window as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: ImageBitmapSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
  if (native) {
    try {
      const [hit] = await new native({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] }).detect(await createImageBitmap(file));
      if (hit?.rawValue) return hit.rawValue;
    } catch {}
  }
  const url = URL.createObjectURL(file);
  try {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const result = await new BrowserMultiFormatReader().decodeFromImageUrl(url);
    const text = result.getText();
    return /^\d{8,14}$/.test(text) ? text : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
