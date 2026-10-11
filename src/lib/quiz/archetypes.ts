export type ArchetypeId =
  | "sunlit-archivist"
  | "neon-maximalist"
  | "quiet-luxe"
  | "salt-air-romantic"
  | "midnight-scholar"
  | "wild-botanist";

export type Swatch = { name: string; hex: string };

export type Archetype = {
  id: ArchetypeId;
  name: string;
  tagline: string;
  palette: [Swatch, Swatch, Swatch, Swatch, Swatch];
  keywords: [string, string, string];
  /** Phrases that steer an Arcade pattern prompt toward this style. */
  promptFragments: string[];
};

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  "sunlit-archivist": {
    id: "sunlit-archivist",
    name: "Sunlit Archivist",
    tagline: "Every object you own has a story, and you'll tell it.",
    palette: [
      { name: "Linen", hex: "#E8D8B9" },
      { name: "Terracotta", hex: "#C8743A" },
      { name: "Olive", hex: "#6E7F4F" },
      { name: "Walnut", hex: "#3B2F2A" },
      { name: "Cream", hex: "#F3EBDD" },
    ],
    keywords: ["Collected", "Sun-faded", "Storied"],
    promptFragments: ["vintage-inspired", "sun-faded warm tones", "hand-drawn motifs", "flea-market charm"],
  },
  "neon-maximalist": {
    id: "neon-maximalist",
    name: "Neon Maximalist",
    tagline: "Beige was never invited.",
    palette: [
      { name: "Hot Pink", hex: "#FF3E7F" },
      { name: "Marigold", hex: "#FFD23F" },
      { name: "Lagoon", hex: "#2EC4B6" },
      { name: "Ultraviolet", hex: "#3A0CA3" },
      { name: "Vanilla", hex: "#FFF4E0" },
    ],
    keywords: ["Loud", "Joyful", "Clashing"],
    promptFragments: ["bold saturated colors", "playful clashing patterns", "graphic pop-art shapes", "joyful energy"],
  },
  "quiet-luxe": {
    id: "quiet-luxe",
    name: "Quiet Luxe",
    tagline: "Fewer things, better things, perfectly placed.",
    palette: [
      { name: "Bone", hex: "#EDEAE4" },
      { name: "Oat", hex: "#BFB6A8" },
      { name: "Stone", hex: "#8A8174" },
      { name: "Charcoal", hex: "#2B2A28" },
      { name: "Paper", hex: "#FFFFFF" },
    ],
    keywords: ["Pared-back", "Tactile", "Calm"],
    promptFragments: ["minimal", "tonal neutrals", "subtle texture", "quiet sculptural forms"],
  },
  "salt-air-romantic": {
    id: "salt-air-romantic",
    name: "Salt-Air Romantic",
    tagline: "Your home is permanently on summer break.",
    palette: [
      { name: "Sea Mist", hex: "#DCE8EC" },
      { name: "Harbor", hex: "#7FA7B8" },
      { name: "Sand", hex: "#F2E3D5" },
      { name: "Coral", hex: "#D98F6E" },
      { name: "Deep Tide", hex: "#2F4858" },
    ],
    keywords: ["Breezy", "Washed", "Easy"],
    promptFragments: ["coastal", "washed watercolor blues", "relaxed stripes and shells", "breezy and airy"],
  },
  "midnight-scholar": {
    id: "midnight-scholar",
    name: "Midnight Scholar",
    tagline: "Candlelight, first editions, and strong opinions.",
    palette: [
      { name: "Ink", hex: "#2C2A3A" },
      { name: "Oxblood", hex: "#6B2D3C" },
      { name: "Brass", hex: "#A08C5B" },
      { name: "Parchment", hex: "#D9CBA3" },
      { name: "Night", hex: "#1A1A1A" },
    ],
    keywords: ["Moody", "Literary", "Rich"],
    promptFragments: ["dark academia", "moody jewel tones", "antique engraving details", "rich and literary"],
  },
  "wild-botanist": {
    id: "wild-botanist",
    name: "Wild Botanist",
    tagline: "If it can grow indoors, it's already in your cart.",
    palette: [
      { name: "Fern", hex: "#2F5D3A" },
      { name: "Sage", hex: "#9BBF7A" },
      { name: "Pollen", hex: "#E9D985" },
      { name: "Clay", hex: "#C2573A" },
      { name: "Unbleached", hex: "#F5F0E1" },
    ],
    keywords: ["Lush", "Organic", "Earthy"],
    promptFragments: ["botanical", "lush leaves and wildflowers", "earthy organic palette", "hand-painted gouache"],
  },
};

export const ARCHETYPE_IDS = Object.keys(ARCHETYPES) as ArchetypeId[];
