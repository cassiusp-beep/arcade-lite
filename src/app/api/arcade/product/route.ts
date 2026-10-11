import { arcade, errorResponse, type ArcadeJob, type ArcadePattern } from "@/lib/arcade";

/** Build a (recolored) pattern into a product with the same options as the original. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const patternId = typeof body?.patternId === "string" ? body.patternId : "";
  const categoryId = typeof body?.categoryId === "string" ? body.categoryId : "";
  const selections = body?.selections && typeof body.selections === "object" ? (body.selections as Record<string, string>) : null;
  if (!patternId || !categoryId || !selections) return Response.json({ error: "patternId, categoryId and selections are required" }, { status: 400 });

  try {
    // Confirm the selection is still manufacturable and use Arcade's complete version of it.
    const cat = await arcade<{ selections: Record<string, string>; canManufacture: boolean }>("categories/get", { categoryId, selections });
    if (!cat.canManufacture) return Response.json({ error: "Those options can't be made right now" }, { status: 409 });
    // Arcade needs an explicit fit when the print's shape differs from the product's. Use a
    // centered cover crop, which is how Arcade placed the original (see docs/context/arcade.md).
    const pattern = await arcade<ArcadePattern>("patterns/get", { patternId });
    const size = Object.values(cat.selections).map((v) => /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/.exec(v)).find(Boolean);
    let fit: { mode: "crop"; zoomLevel: 1; crop: { left: number; top: number; width: number; height: number } } | undefined;
    if (size && pattern.width && pattern.height) {
      const target = Number(size[1]) / Number(size[2]);
      const source = pattern.width / pattern.height;
      const width = Math.round(source > target ? pattern.height * target : pattern.width);
      const height = Math.round(source > target ? pattern.height : pattern.width / target);
      fit = { mode: "crop", zoomLevel: 1, crop: { left: Math.round((pattern.width - width) / 2), top: Math.round((pattern.height - height) / 2), width, height } };
    }
    const job = await arcade<ArcadeJob>("products/create", {
      requestId: crypto.randomUUID(),
      patternId,
      categoryId,
      selections: cat.selections,
      ...(fit ? { fit } : {}),
    });
    return Response.json({ jobId: job.jobId });
  } catch (err) {
    return errorResponse(err);
  }
}
