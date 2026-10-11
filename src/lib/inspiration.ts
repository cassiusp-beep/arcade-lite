/** In-store inspiration saved on this device (barcode + photo → Arcade reference). */
export type Inspiration = {
  id: string;
  label: string;
  barcode?: string;
  photoDataUrl?: string;
  referenceId?: string;
  savedAt: string;
};

const KEY = "arcade-lite:inspirations";

export function loadInspirations(): Inspiration[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Inspiration[];
  } catch {
    return [];
  }
}

export function saveInspirations(items: Inspiration[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Quota exceeded (large photos): keep going without persisting.
  }
}
