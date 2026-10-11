/**
 * Server-only Gemini client (structured JSON output). Reads GEMINI_API_KEY; never import from
 * a client component. Free tier: models get overloaded (503) or rate limited (429), so we try a
 * short list of fast models inside one time budget, and every caller keeps a non-LLM fallback.
 */
const MODELS = (process.env.GEMINI_MODELS || "gemini-3.5-flash,gemini-flash-lite-latest,gemini-flash-latest").split(",");

export async function geminiJson<T>(prompt: string, schema: object, budgetMs = 8000): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set on the server");
  const deadline = Date.now() + budgetMs;
  let lastError = "no model answered";

  for (const model of MODELS) {
    const remaining = deadline - Date.now();
    if (remaining < 500) break;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.trim()}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.9 },
        }),
        signal: AbortSignal.timeout(remaining),
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        lastError = `${model} ${res.status}`;
        continue; // overloaded, rate limited or unknown model: try the next one
      }
      const text: string = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      return JSON.parse(text) as T;
    } catch (err) {
      lastError = `${model} ${err instanceof Error ? err.name : "error"}`;
    }
  }
  throw new Error(`Gemini unavailable (${lastError})`);
}
