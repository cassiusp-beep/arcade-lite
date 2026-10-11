import { geminiJson } from "@/lib/gemini";

const SCHEMA = {
  type: "object",
  properties: {
    styleName: { type: "string" },
    tagline: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
    designDirection: { type: "string" },
  },
  required: ["styleName", "tagline", "keywords", "designDirection"],
};

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/[—–]/g, ",").replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Quiz aura + music + base archetype → a one-of-a-kind style profile (name, tagline, keywords, design direction). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const archetype = clean(body?.archetype, 40);
  const secondary = clean(body?.secondary, 40);
  const aura = Array.isArray(body?.aura) ? body.aura.map((k: unknown) => clean(k, 20)).filter(Boolean).slice(0, 12) : [];
  const music = clean(body?.music, 120);
  if (!archetype) return Response.json({ error: "archetype is required" }, { status: 400 });

  const prompt = `You are a witty personal stylist in a Gen Z home and jewelry design app with a little Y2K nostalgia.
Base style: ${archetype}, with a streak of ${secondary || "something unexpected"}.
Words from their quiz answers: ${aura.join(", ") || "none"}.
Music they love: ${music || "not shared"}.

Write their style profile:
- styleName: 2 or 3 words, one of a kind, fun to share (not the base style name, no "The").
- tagline: one sentence under 70 characters that makes them feel seen.
- keywords: 3 single Title Case words.
- designDirection: one sentence (under 160 characters) describing the patterns we should design for them. Interpret their taste sideways, never literally: if they love the beach, do NOT suggest shells or waves; translate it into color, rhythm, texture and unexpected motifs. Be bold and specific.
Never use em dashes or en dashes.`;

  try {
    const r = await geminiJson<Record<string, unknown>>(prompt, SCHEMA, 5000);
    const keywords = Array.isArray(r.keywords) ? r.keywords.map((k) => clean(k, 18).split(" ")[0]).filter(Boolean).slice(0, 3) : [];
    const out = { styleName: clean(r.styleName, 32), tagline: clean(r.tagline, 90), keywords, designDirection: clean(r.designDirection, 180) };
    if (out.styleName && out.tagline && keywords.length === 3 && out.designDirection) return Response.json(out);
  } catch {
    // Free tier busy: the client keeps the archetype profile.
  }
  return Response.json({ error: "Profile writer unavailable" }, { status: 503 });
}
