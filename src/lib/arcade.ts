/**
 * Server-only Arcade API client. Never import from a client component: it reads ARCADE_API_KEY.
 * Rules (docs/context/arcade.md): POST + JSON, bearer key, a named User-Agent, and retrying
 * 429/5xx/409 with the same body (and so the same requestId).
 */
const BASE = "https://platform.arcade.ai/v1";

export class ArcadeError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

export async function arcade<T>(procedure: string, body: object = {}, attempts = 3): Promise<T> {
  const key = process.env.ARCADE_API_KEY;
  if (!key) throw new ArcadeError(500, "NO_KEY", "ARCADE_API_KEY is not set on the server");

  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${BASE}/${procedure}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "User-Agent": process.env.ARCADE_USER_AGENT || "arcade-lite/0.1",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (res.ok) return (await res.json()) as T;

    const retryable = res.status === 429 || res.status === 409 || res.status >= 500;
    if (retryable && attempt < attempts) {
      const wait = Number(res.headers.get("retry-after")) || attempt * 2;
      await new Promise((r) => setTimeout(r, Math.min(wait, 10) * 1000));
      continue;
    }
    const data = await res.json().catch(() => null);
    throw new ArcadeError(res.status, data?.code, data?.message ?? `Arcade ${procedure} returned ${res.status}`);
  }
}

export type ArcadeCategory = {
  categoryId: string;
  name: string;
  imageUrl: string | null;
  world: "print" | "jewelry";
};

export type ArcadeJob = {
  jobId: string;
  status: "running" | "succeeded" | "failed";
  result: { patternId?: string; productId?: string } | null;
  error: { message: string } | null;
};

export type ArcadeProduct = {
  productId: string;
  patternId: string;
  title: string;
  categoryId: string;
  selectionLabel: string;
  imageUrl: string;
  images: { url: string }[];
  careInstructions: string;
  unitPrice: { amount: string; currency: string } | null;
};

export type ArcadePattern = { patternId: string; imageUrl: string; width: number; height: number };

export function errorResponse(err: unknown) {
  const status = err instanceof ArcadeError ? err.status : 500;
  const message = err instanceof Error ? err.message : "Unexpected error";
  return Response.json({ error: message }, { status: status >= 400 && status < 600 ? status : 500 });
}
