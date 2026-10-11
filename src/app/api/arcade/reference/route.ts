import { arcade, errorResponse } from "@/lib/arcade";

type Upload = { uploadId: string; uploadUrl: string; requiredHeaders?: Record<string, string> };

const MAX_BYTES = 4 * 1024 * 1024; // Vercel's request limit is ~4.5MB; the client downsizes first.

/** In-store photo → Arcade reference: references/createUpload → PUT bytes → references/create. */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) return Response.json({ error: "photo is required" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Photo is too large" }, { status: 413 });
  const mediaType = file.type || "image/jpeg";
  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    const upload = await arcade<Upload>("references/createUpload", {
      requestId: crypto.randomUUID(),
      mediaType,
      byteLength: bytes.byteLength,
    });
    // The upload URL is signed storage, not the API: send exactly the required headers and no key.
    const put = await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: upload.requiredHeaders ?? { "Content-Type": mediaType },
      body: bytes,
    });
    if (!put.ok) return Response.json({ error: `Upload failed (${put.status})` }, { status: 502 });

    const ref = await arcade<{ referenceId: string }>("references/create", {
      requestId: crypto.randomUUID(),
      uploadId: upload.uploadId,
    });
    return Response.json({ referenceId: ref.referenceId });
  } catch (err) {
    return errorResponse(err);
  }
}
