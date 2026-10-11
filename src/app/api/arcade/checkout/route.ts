import { arcade, errorResponse } from "@/lib/arcade";

/** Create a checkout for one made-to-order item. The shopper pays on Arcade's page; we never do. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const productId = typeof body?.productId === "string" ? body.productId : "";
  if (!productId) return Response.json({ error: "productId is required" }, { status: 400 });

  try {
    const { checkoutUrl } = await arcade<{ checkoutId: string; checkoutUrl: string }>("checkouts/create", {
      requestId: crypto.randomUUID(),
      lines: [{ productId, quantity: 1 }],
      dropShip: true,
    });
    return Response.json({ checkoutUrl });
  } catch (err) {
    return errorResponse(err);
  }
}
