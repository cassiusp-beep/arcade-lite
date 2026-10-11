import { arcade, errorResponse, type ArcadeJob } from "@/lib/arcade";
import { sunSmartColor } from "@/lib/light";

/** "Make it last": read the print's color clusters, soften each, and start Arcade's recolor job. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const patternId = typeof body?.patternId === "string" ? body.patternId : "";
  if (!patternId) return Response.json({ error: "patternId is required" }, { status: 400 });

  try {
    // The recolor must use the same clusterCount as recolorClusters, or Arcade rejects the mapping.
    const CLUSTERS = 6;
    const { clusters } = await arcade<{ clusters: { clusterId: string; color: string }[] }>("patterns/refine/recolorClusters", {
      requestId: crypto.randomUUID(),
      patternId,
      clusterCount: CLUSTERS,
    });
    const colors = clusters.map((c) => ({ clusterId: c.clusterId, color: sunSmartColor(c.color) }));
    const job = await arcade<ArcadeJob>("patterns/refine/recolor", { requestId: crypto.randomUUID(), patternId, colors, clusterCount: CLUSTERS });
    return Response.json({ jobId: job.jobId, before: clusters.map((c) => c.color), after: colors.map((c) => c.color) });
  } catch (err) {
    return errorResponse(err);
  }
}
