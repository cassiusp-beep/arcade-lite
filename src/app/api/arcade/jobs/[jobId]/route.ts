import { arcade, errorResponse, type ArcadeJob, type ArcadePattern, type ArcadeProduct } from "@/lib/arcade";

/** Poll a job. When it succeeds, return the product (photo, price) and its flat pattern image. */
export async function GET(_request: Request, { params }: RouteContext<"/api/arcade/jobs/[jobId]">) {
  const { jobId } = await params;
  try {
    const job = await arcade<ArcadeJob>("jobs/get", { jobId });
    if (job.status === "running") return Response.json({ status: "running" });
    if (job.status === "failed") return Response.json({ status: "failed", error: job.error?.message ?? "Generation failed" });

    const productId = job.result?.productId;
    if (!productId) {
      // Pattern-only jobs (e.g. a recolor) return the new pattern and its image.
      const patternId = job.result?.patternId;
      if (!patternId) return Response.json({ status: "failed", error: "Arcade finished without a result" });
      const pattern = await arcade<ArcadePattern>("patterns/get", { patternId });
      return Response.json({ status: "succeeded", pattern: { patternId, imageUrl: pattern.imageUrl } });
    }

    const product = await arcade<ArcadeProduct>("products/get", { productId });
    const pattern = await arcade<ArcadePattern>("patterns/get", { patternId: product.patternId }).catch(() => null);
    return Response.json({
      status: "succeeded",
      product: {
        productId: product.productId,
        patternId: product.patternId,
        title: product.title,
        categoryId: product.categoryId,
        imageUrl: product.imageUrl,
        patternImageUrl: pattern?.imageUrl ?? product.imageUrl,
        price: product.unitPrice,
        selectionLabel: product.selectionLabel,
        selections: product.selections,
        careInstructions: product.careInstructions,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
