/**
 * Same-origin image proxy so three.js / model-viewer can use Arcade images as textures
 * (signed storage URLs don't send CORS headers). Only Arcade's storage hosts are allowed.
 */
const ALLOWED_HOSTS = ["storage.googleapis.com", "arcade.ai"];

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("u");
  let target: URL;
  try {
    target = new URL(raw ?? "");
  } catch {
    return new Response("Bad url", { status: 400 });
  }
  const allowed =
    target.protocol === "https:" && ALLOWED_HOSTS.some((h) => target.hostname === h || target.hostname.endsWith(`.${h}`));
  if (!allowed) return new Response("Host not allowed", { status: 403 });

  const upstream = await fetch(target, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) return new Response("Image unavailable", { status: 502 });
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
