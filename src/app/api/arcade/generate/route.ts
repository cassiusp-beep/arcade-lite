import { arcade, errorResponse, type ArcadeJob } from "@/lib/arcade";

/** Start a pattern + product job: patterns/create with a print categoryId builds both. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim().slice(0, 600) : "";
  const categoryId = typeof body?.categoryId === "string" ? body.categoryId : "";
  const jewelry = body?.world === "jewelry";
  // Arcade rejects references (and colors/model) for jewelry; it designs from the prompt alone.
  const referenceIds = !jewelry && Array.isArray(body?.referenceIds)
    ? body.referenceIds.filter((r: unknown) => typeof r === "string").slice(0, 3)
    : [];
  if (!prompt || !categoryId) return Response.json({ error: "prompt and categoryId are required" }, { status: 400 });

  try {
    const job = await arcade<ArcadeJob>("patterns/create", {
      requestId: crypto.randomUUID(),
      prompt,
      categoryId,
      ...(referenceIds.length ? { referenceIds } : {}),
    });
    return Response.json({ jobId: job.jobId });
  } catch (err) {
    return errorResponse(err);
  }
}
