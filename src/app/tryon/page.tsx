"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { textureUrl } from "@/components/product-viewer";
import { formatPrice, loadProduct, tryOnKind, type GeneratedProduct } from "@/lib/catalog";

// MediaPipe runtime and face model, pinned. Loaded only when the shopper starts the camera.
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// Face mesh landmark indices: cheek edges near the ears, jaw corners, chin, forehead.
const L_EDGE = 234, R_EDGE = 454, L_JAW = 132, R_JAW = 361, CHIN = 152, FOREHEAD = 10;

type Status = "idle" | "loading" | "live" | "error";
type Point = { x: number; y: number };

export default function TryOnPage() {
  const [product, setProduct] = useState<GeneratedProduct | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    const demo = new URLSearchParams(location.search).get("demo") === "1";
    if (demo) {
      fetch("/demo/jewelry.json")
        .then((r) => r.json())
        .then((p) => setProduct({ ...p, fallback: true }))
        .catch(() => setProduct(loadProduct()));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of localStorage
      setProduct(loadProduct());
    }
    return () => stopRef.current();
  }, []);

  const kind = product ? tryOnKind(product.categoryName) : null;

  async function start() {
    if (!product || !kind) return;
    setStatus("loading");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } }, audio: false });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      const [{ FaceLandmarker, FilesetResolver }, photo] = await Promise.all([
        import("@mediapipe/tasks-vision"),
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Couldn't load your piece"));
          img.src = textureUrl(product.imageUrl);
        }),
      ]);
      const jewel = cropPiece(photo, kind);
      const fileset = await FilesetResolver.forVisionTasks(WASM);
      const landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
      });

      let raf = 0;
      let lastTime = -1;
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const render = () => {
        const w = video.videoWidth, h = video.videoHeight;
        if (w && h) {
          if (canvas.width !== w) canvas.width = w;
          if (canvas.height !== h) canvas.height = h;
          // Selfie view is mirrored, like a real mirror.
          ctx.save();
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, w, h);
          ctx.restore();

          const now = performance.now();
          if (now !== lastTime) {
            lastTime = now;
            const lm = landmarker.detectForVideo(video, now).faceLandmarks?.[0];
            if (lm) drawJewelry(ctx, jewel, kind!, (i) => ({ x: (1 - lm[i].x) * w, y: lm[i].y * h }));
          }
        }
        raf = requestAnimationFrame(render);
      };
      render();
      setStatus("live");
      stopRef.current = () => {
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        landmarker.close();
      };
    } catch (err) {
      const denied = err instanceof DOMException && err.name === "NotAllowedError";
      setError(denied ? "Camera access was declined. Allow it in Safari settings to try it on." : "Try-on couldn't start on this device.");
      setStatus("error");
    }
  }

  function snap() {
    const url = canvasRef.current?.toDataURL("image/jpeg", 0.9);
    if (url) setShot(url);
  }

  async function shareShot() {
    if (!shot) return;
    const blob = await (await fetch(shot)).blob();
    const file = new File([blob], "arcade-lite-tryon.jpg", { type: "image/jpeg" });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: product?.title }).catch(() => {});
    else {
      const a = document.createElement("a");
      a.href = shot;
      a.download = "arcade-lite-tryon.jpg";
      a.click();
    }
  }

  if (!product) return <main className="flex-1" />;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Link href="/product" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-xl" aria-label="Back to your piece">
        ←
      </Link>
      <p className="mt-1 text-xs font-medium tracking-[0.2em] uppercase text-accent">Try it on</p>
      <h1 className="mt-2 font-display text-[1.9rem] leading-[1.05] tracking-tight">{product.title}</h1>

      <div className="relative mt-4 aspect-[3/4] w-full overflow-hidden rounded-2xl border-2 border-ink bg-ink">
        <video ref={videoRef} playsInline muted className="hidden" />
        <canvas ref={canvasRef} className={`h-full w-full object-cover ${status === "live" ? "" : "opacity-0"}`} />
        {status !== "live" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-paper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={textureUrl(product.imageUrl)} alt="" className="h-28 w-28 rounded-xl bg-white object-contain" />
            {!kind ? (
              <p>Try-on works for earrings and necklaces. Rings need hand tracking, coming next.</p>
            ) : status === "loading" ? (
              <p aria-live="polite">Finding your face…</p>
            ) : (
              <>
                <p>See your {kind} on you, live. Your camera stays on your phone; nothing is uploaded.</p>
                <button type="button" onClick={start} className="h-12 rounded-full bg-paper px-6 font-semibold text-ink">
                  Turn on camera
                </button>
              </>
            )}
            {error && <p className="text-sm text-[#ffb4a8]">{error}</p>}
          </div>
        )}
        {status === "live" && (
          <button
            type="button"
            onClick={snap}
            aria-label="Take a photo"
            className="absolute bottom-4 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full border-4 border-paper bg-paper/30 active:scale-95"
          />
        )}
      </div>

      {shot && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot} alt="Your try-on photo" className="h-20 w-16 rounded-lg object-cover" />
          <button type="button" onClick={shareShot} className="h-12 flex-1 rounded-full border-2 border-ink font-semibold">
            Share my try-on
          </button>
        </div>
      )}

      <Link
        href="/product"
        className="mt-auto flex h-14 items-center justify-center rounded-full bg-accent text-base font-semibold text-white"
        style={{ marginTop: "1.5rem" }}
      >
        Love it · {formatPrice(product.price)}
      </Link>
    </main>
  );
}

const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Crop the actual Arcade product photo tight to the piece. Background = the photo's corner color;
 * everything that differs from it is jewelry. For earrings the photo shows a pair (often one
 * front-on, one in profile), so we keep the left one, which Arcade shoots front-on.
 */
function cropPiece(img: HTMLImageElement, kind: "earrings" | "necklace"): HTMLCanvasElement {
  const S = 256;
  const probe = document.createElement("canvas");
  probe.width = probe.height = S;
  const pctx = probe.getContext("2d", { willReadFrequently: true })!;
  pctx.drawImage(img, 0, 0, S, S);
  const d = pctx.getImageData(0, 0, S, S).data;
  const bg = [d[0], d[1], d[2]];
  const maxX = kind === "earrings" ? S / 2 : S;
  let x0 = S, y0 = S, x1 = 0, y1 = 0;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < maxX; x++) {
      const i = (y * S + x) * 4;
      if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 60) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
  if (x1 <= x0 || y1 <= y0) { x0 = 0; y0 = 0; x1 = maxX - 1; y1 = S - 1; }
  const k = img.width / S;
  const out = document.createElement("canvas");
  out.width = Math.round((x1 - x0 + 1) * k);
  out.height = Math.round((y1 - y0 + 1) * k);
  out.getContext("2d")!.drawImage(img, x0 * k, y0 * k, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

/** Pin the cropped piece to the face. Multiply blending drops what's left of the studio backdrop. */
function drawJewelry(ctx: CanvasRenderingContext2D, piece: HTMLCanvasElement, kind: "earrings" | "necklace", at: (i: number) => Point) {
  const faceW = dist(at(L_EDGE), at(R_EDGE));
  const aspect = piece.height / piece.width;
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  if (kind === "earrings") {
    const w = faceW * 0.09; // a stud is roughly a tenth of face width
    const ears = [lerp(at(R_EDGE), at(R_JAW), 0.5), lerp(at(L_EDGE), at(L_JAW), 0.5)].sort((a, b) => a.x - b.x);
    ears.forEach((ear, i) => {
      ctx.save();
      ctx.translate(ear.x + (i === 0 ? -1 : 1) * w * 0.35, ear.y);
      if (i === 1) ctx.scale(-1, 1); // mirror for the other ear
      ctx.drawImage(piece, -w / 2, -w * aspect * 0.3, w, w * aspect);
      ctx.restore();
    });
  } else {
    const chin = at(CHIN);
    const up = at(FOREHEAD);
    const center = { x: chin.x + (chin.x - up.x) * 0.45, y: chin.y + (chin.y - up.y) * 0.45 };
    const w = faceW * 0.45;
    ctx.drawImage(piece, center.x - w / 2, center.y - (w * aspect) / 2, w, w * aspect);
  }
  ctx.restore();
}
