import { arcade, errorResponse, type ArcadeCategory } from "@/lib/arcade";
import { HOME_CATEGORIES, JEWELRY_CATEGORIES, type CatalogItem } from "@/lib/catalog";

export async function GET() {
  try {
    const { items } = await arcade<{ items: ArcadeCategory[] }>("categories/list");
    const catalog: CatalogItem[] = HOME_CATEGORIES.flatMap((home) => {
      const match = items.find((c) => c.world === "print" && c.name === home.name);
      return match ? [{ ...home, categoryId: match.categoryId, imageUrl: match.imageUrl, world: "print" as const }] : [];
    });
    for (const piece of JEWELRY_CATEGORIES) {
      const match = items.find((c) => c.world === "jewelry" && c.name === piece.name);
      if (match) catalog.push({ ...piece, categoryId: match.categoryId, imageUrl: match.imageUrl, mesh: null, world: "jewelry" });
    }
    return Response.json({ items: catalog }, { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (err) {
    return errorResponse(err);
  }
}
