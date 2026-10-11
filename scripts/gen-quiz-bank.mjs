// Generates the vibe-check question bank with Gemini and writes src/lib/quiz/bank.json.
// Run: node --env-file=.env.local scripts/gen-quiz-bank.mjs
import fs from "node:fs";

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const ARCHETYPES = ["sunlit-archivist", "neon-maximalist", "quiet-luxe", "salt-air-romantic", "midnight-scholar", "wild-botanist"];
const OUT = "src/lib/quiz/bank.json";

const PROMPT = `You write questions for "Arcade Lite", a Gen Z style quiz on a phone. It is chronically online, playful, with a little Y2K nostalgia (flip phones, butterfly clips, frosted lip gloss, burned CDs, AIM away messages, Tamagotchis) and a modern spin.

Write 30 multiple-choice questions. Each has 4 answers. The quiz decides a person's home-decor style, so answers must lean toward these style archetypes:
- sunlit-archivist: vintage, collected, warm, thrifted, storied
- neon-maximalist: loud color, clashing patterns, joyful, more is more
- quiet-luxe: minimal, tonal neutrals, tactile, calm, few perfect things
- salt-air-romantic: coastal, breezy, washed blues, easy
- midnight-scholar: moody, dark academia, literary, jewel tones
- wild-botanist: plants, earthy, organic, lush

WHAT TESTERS TOLD US (follow this closely):
- They love questions that get niche and specific about their real everyday life: coffee order, everyday shoe of choice, morning shower or night shower, what kind of friend they are in the group chat, phone wallpaper, go-to karaoke song, how they pack a bag, what is in their camera roll.
- Avoid abstract or imaginary questions (e.g. "pick a texture to live inside"): people got stuck trying to figure them out.
- Avoid questions about celebrities: people do not care what celebrities buy.
- Every question must be instantly answerable in under 3 seconds.

Rules:
- Every question has a distinct "topic" (snake_case, e.g. coffee_order). No two questions share a topic.
- "kicker" is a 1 to 3 word label like a magazine section (e.g. "Morning routine").
- "prompt" is under 70 characters. Answers ("label") are under 40 characters, funny and specific.
- Each answer has one emoji, a "color" (a hex like #A1B2C3 that matches the answer's vibe, for a live mood board), a single-word "keyword" (Title Case), and "weights": 1 or 2 archetypes from the list above with values 1 to 3.
- Across the whole bank, every archetype should be the top weight for roughly the same number of answers.
- Never use em dashes or en dashes. No hashtags. Keep it kind: no jokes about bodies, money stress, or mental health.`;

const SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          kicker: { type: "string" },
          prompt: { type: "string" },
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                emoji: { type: "string" },
                color: { type: "string" },
                keyword: { type: "string" },
                weights: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { archetype: { type: "string", enum: ARCHETYPES }, score: { type: "integer" } },
                    required: ["archetype", "score"],
                  },
                },
              },
              required: ["label", "emoji", "color", "keyword", "weights"],
            },
          },
        },
        required: ["topic", "kicker", "prompt", "options"],
      },
    },
  },
  required: ["questions"],
};

async function generate() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: PROMPT }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 1 },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${data?.error?.message?.slice(0, 200)}`);
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return JSON.parse(text).questions;
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 32);

function clean(raw) {
  const seen = new Set();
  const out = [];
  for (const q of raw) {
    const topic = slug(q.topic || q.prompt);
    if (!topic || seen.has(topic) || !Array.isArray(q.options) || q.options.length < 3) continue;
    if (/[—–]/.test(JSON.stringify(q))) continue;
    const options = q.options
      .map((o, i) => {
        const weights = Object.fromEntries(
          (o.weights || []).filter((w) => ARCHETYPES.includes(w.archetype)).map((w) => [w.archetype, Math.max(1, Math.min(3, w.score | 0))]),
        );
        if (!Object.keys(weights).length || !/^#[0-9a-f]{6}$/i.test(o.color)) return null;
        return { id: `${slug(o.label) || "opt"}-${i}`, label: o.label.trim(), emoji: o.emoji, color: o.color, keyword: o.keyword.trim().split(/\s+/)[0], weights, next: null };
      })
      .filter(Boolean);
    if (options.length < 3) continue;
    seen.add(topic);
    out.push({ id: `b-${topic}`, topic, kicker: q.kicker.trim(), prompt: q.prompt.trim(), options });
  }
  return out;
}

let questions = [];
for (let attempt = 1; attempt <= 2 && questions.length < 20; attempt++) {
  try {
    questions = clean(await generate());
    console.log(`attempt ${attempt}: ${questions.length} valid questions`);
  } catch (e) {
    console.error(`attempt ${attempt} failed:`, e.message);
  }
}
if (questions.length < 8) {
  console.error("Not enough valid questions; bank unchanged.");
  process.exit(1);
}
fs.writeFileSync(OUT, JSON.stringify({ generatedBy: MODEL, generatedAt: new Date().toISOString(), questions }, null, 2) + "\n");
const tops = {};
for (const q of questions) for (const o of q.options) { const t = Object.entries(o.weights).sort((a, b) => b[1] - a[1])[0][0]; tops[t] = (tops[t] || 0) + 1; }
console.log("wrote", OUT, "| top-archetype balance:", JSON.stringify(tops));
for (const q of questions.slice(0, 30)) console.log(` - [${q.kicker}] ${q.prompt}`);
