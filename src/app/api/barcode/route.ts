/** Look up a scanned UPC/EAN to name the in-store item (UPCitemdb free tier, no key). */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.replace(/\D/g, "") ?? "";
  if (code.length < 8 || code.length > 14) return Response.json({ error: "Not a product barcode" }, { status: 400 });

  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json().catch(() => null);
    const item = data?.items?.[0];
    if (!item) return Response.json({ code, title: null });
    return Response.json({ code, title: item.title as string, brand: (item.brand as string) || null });
  } catch {
    // Lookup is a nice-to-have: the photo still works as inspiration without it.
    return Response.json({ code, title: null });
  }
}
