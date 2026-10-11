import { geminiJson } from "@/lib/gemini";
import { ARCHETYPE_IDS } from "@/lib/quiz/archetypes";
import { curatedVibe, sanitizeVibe } from "@/lib/soundtrack";

const SCHEMA = {
  type: "object",
  properties: {
    colors: { type: "array", items: { type: "string" } },
    keywords: { type: "array", items: { type: "string" } },
    line: { type: "string" },
    weights: {
      type: "array",
      items: {
        type: "object",
        properties: { archetype: { type: "string", enum: ARCHETYPE_IDS }, score: { type: "integer" } },
        required: ["archetype", "score"],
      },
    },
  },
  required: ["colors", "keywords", "line", "weights"],
};

/** Music (1–2 artists or a playlist name) → aura colors, keywords, a one-line read, style weights. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const music = typeof body?.music === "string" ? body.music.trim().slice(0, 120) : "";
  if (!music) return Response.json({ error: "Tell us an artist or playlist" }, { status: 400 });

  const prompt = `Someone's favorite music is: "${music}".
Translate the feeling of this music into home-decor style for a playful Gen Z style app with Y2K nostalgia.
Return:
- colors: 3 hex colors (#RRGGBB) that feel like this music
- keywords: 3 single Title Case words describing the vibe
- line: one short, warm, specific sentence (under 80 characters) reading their taste back to them. No em dashes. Do not just repeat the artist name.
- weights: 1 or 2 of these style archetypes with scores 1 to 3: sunlit-archivist (vintage, warm), neon-maximalist (loud, color), quiet-luxe (minimal, calm), salt-air-romantic (breezy, coastal), midnight-scholar (moody, literary), wild-botanist (earthy, plants).`;

  try {
    const vibe = sanitizeVibe(await geminiJson(prompt, SCHEMA, 7000));
    if (vibe) return Response.json(vibe);
  } catch {
    // Free-tier limit, timeout or bad output: the curated map keeps the step working.
  }
  return Response.json(curatedVibe(music));
}
