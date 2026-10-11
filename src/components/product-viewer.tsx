"use client";

import { useEffect, useRef, useState } from "react";
import type { MeshKind } from "@/lib/catalog";
import type { ViewerLight } from "@/lib/light";

type ModelViewerElement = HTMLElement & {
  canActivateAR: boolean;
  createTexture: (uri: string) => Promise<unknown>;
  model?: { materials: { name: string; pbrMetallicRoughness: { baseColorTexture: { setTexture: (t: unknown) => void } } }[] };
};

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, unknown>;
    }
  }
}

/** Arcade images are signed and cross-origin; local demo assets are already same-origin. */
export function textureUrl(url: string) {
  return url.startsWith("/") ? url : `/api/image?u=${encodeURIComponent(url)}`;
}

type Props = { mesh: MeshKind; patternUrl: string; light: ViewerLight; alt: string };

export function ProductViewer({ mesh, patternUrl, light, alt }: Props) {
  const ref = useRef<ModelViewerElement>(null);
  const [ready, setReady] = useState(false);
  const [canAR, setCanAR] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    import("@google/model-viewer").catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    async function applyPattern() {
      try {
        const texture = await el!.createTexture(textureUrl(patternUrl));
        for (const m of el!.model?.materials ?? []) {
          if (m.name === "pattern") m.pbrMetallicRoughness.baseColorTexture.setTexture(texture);
        }
        setReady(true);
        setCanAR(Boolean(el!.canActivateAR));
      } catch {
        setFailed(true);
      }
    }
    el.addEventListener("load", applyPattern);
    el.addEventListener("error", () => setFailed(true));
    return () => el.removeEventListener("load", applyPattern);
  }, [patternUrl, mesh]);

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-ink bg-white">
      <model-viewer
        ref={ref}
        src={`/models/${mesh}.glb`}
        alt={alt}
        ar=""
        ar-modes="webxr scene-viewer quick-look"
        ar-placement={mesh === "curtain" ? "wall" : "floor"}
        ar-scale="fixed"
        camera-controls=""
        touch-action="pan-y"
        camera-orbit="20deg 78deg auto"
        auto-rotate=""
        auto-rotate-delay="1500"
        rotation-per-second="20deg"
        shadow-intensity="1"
        shadow-softness={String(light.shadowSoftness)}
        exposure={String(light.exposure)}
        environment-image="neutral"
        interaction-prompt="none"
        style={{ width: "100%", height: "min(62vh, 440px)", backgroundColor: "transparent" }}
      >
        <button
          slot="ar-button"
          className="absolute right-3 bottom-3 left-3 flex h-14 items-center justify-center rounded-full bg-ink text-base font-semibold text-paper"
        >
          View in your room
        </button>
      </model-viewer>
      <div className="pointer-events-none absolute inset-0 transition-colors duration-500" style={{ background: light.wash }} aria-hidden />
      {!ready && !failed && (
        <p className="absolute inset-x-0 top-4 text-center text-sm text-muted" aria-live="polite">
          Setting up your room…
        </p>
      )}
      {failed && (
        <p className="absolute inset-x-0 top-4 px-4 text-center text-sm text-muted">3D preview isn&rsquo;t available on this device.</p>
      )}
      {ready && !canAR && (
        <p className="absolute inset-x-0 bottom-3 text-center text-xs text-muted">Open on an iPhone to place it in your room in AR.</p>
      )}
    </div>
  );
}
