/**
 * ERA stamp identities. Every activity owns a visual identity (shape + ink colour + emblem)
 * that is used on its passport stamp, cards, tickets and the provider's dashboard.
 * Shared by client and server (no React here).
 */
export const STAMP_SHAPES = [
  "circle",
  "scalloped",
  "sunburst",
  "hexagon",
  "octagon",
  "shield",
] as const;
export type StampShape = (typeof STAMP_SHAPES)[number];
export const SHAPE_LABELS: Record<StampShape, string> = {
  circle: "Classic Circle",
  scalloped: "Scalloped Seal",
  sunburst: "Sunburst",
  hexagon: "Hexagon",
  octagon: "Octagon",
  shield: "Heritage Shield",
};

export const STAMP_COLORS = {
  plum: { label: "Royal Aubergine", ink: "#533868" },
  emerald: { label: "Palm Green", ink: "#56684c" },
  indigo: { label: "Night Indigo", ink: "#4a4a86" },
  terracotta: { label: "Najdi Clay", ink: "#9c6249" },
  crimson: { label: "Asiri Wine", ink: "#874a5c" },
  rose: { label: "Taif Rose", ink: "#a07078" },
  gold: { label: "Desert Brass", ink: "#9a7b5f" },
  teal: { label: "Red Sea Teal", ink: "#4b6a72" },
  cocoa: { label: "Arabic Coffee", ink: "#6c4d42" },
} as const;
export type StampColor = keyof typeof STAMP_COLORS;
export const STAMP_COLOR_KEYS = Object.keys(STAMP_COLORS) as StampColor[];

export const STAMP_ICONS = {
  matcha: "Matcha Bowl",
  coffee: "Coffee Cup",
  stars: "Night Sky",
  sun: "Desert Sun",
  tennis: "Tennis",
  ball: "Sport Ball",
  horseshoe: "Horseshoe",
  pyramids: "Pyramids",
  palette: "Art Palette",
  mask: "Theatre",
  music: "Music",
  book: "Stories",
  lotus: "Lotus",
  wave: "Sea Wave",
  palm: "Palm Tree",
  mountain: "Mountains",
  landmark: "Heritage Gate",
  compass: "Compass",
} as const;
export type StampIcon = keyof typeof STAMP_ICONS;
export const STAMP_ICON_KEYS = Object.keys(STAMP_ICONS) as StampIcon[];

export interface StampIdentity {
  shape: StampShape;
  color: StampColor;
  icon: StampIcon;
}

export const isStampShape = (v: unknown): v is StampShape =>
  typeof v === "string" && (STAMP_SHAPES as readonly string[]).includes(v);
export const isStampColor = (v: unknown): v is StampColor =>
  typeof v === "string" && v in STAMP_COLORS;
export const isStampIcon = (v: unknown): v is StampIcon =>
  typeof v === "string" && v in STAMP_ICONS;

/** Hand-designed identities for ERA's signature experiences (matched by their cover image). */
const SIGNATURE: Record<string, StampIdentity> = {
  "/So_Matcha_Experience_Riyadh.png": { shape: "scalloped", color: "emerald", icon: "matcha" },
  "/Stargazing_Experience_AlUla.png": { shape: "circle", color: "indigo", icon: "stars" },
  "/Jeddah_Tennis.png": { shape: "hexagon", color: "terracotta", icon: "tennis" },
  "/Louvre_Art_Experience_Paris.png": { shape: "octagon", color: "crimson", icon: "palette" },
  "/Alo_Yoga_Experience_London.png": { shape: "shield", color: "rose", icon: "lotus" },
  "/Pyramids_Equestrian_Egypt.png": { shape: "sunburst", color: "gold", icon: "pyramids" },
};

const BY_TYPE: Record<string, { icons: StampIcon[]; colors: StampColor[] }> = {
  Sport: {
    icons: ["ball", "tennis", "horseshoe", "mountain", "compass"],
    colors: ["terracotta", "teal", "gold", "indigo"],
  },
  Wellness: {
    icons: ["lotus", "sun", "wave", "stars", "palm"],
    colors: ["emerald", "rose", "teal", "plum"],
  },
  Entertainment: {
    icons: ["mask", "music", "palette", "landmark", "book", "coffee"],
    colors: ["crimson", "plum", "cocoa", "indigo"],
  },
};

/** Keyword hints so an auto identity still "feels" like the activity. */
const KEYWORDS: [RegExp, StampIcon][] = [
  [/matcha|tea/i, "matcha"],
  [/coffee|qahwa|dallah|cafe/i, "coffee"],
  [/star|night|astro|moon/i, "stars"],
  [/tennis|padel|squash/i, "tennis"],
  [/horse|equestrian|riding/i, "horseshoe"],
  [/pyramid|egypt|giza/i, "pyramids"],
  [/paint|art|museum|gallery|draw/i, "palette"],
  [/yoga|pilates|meditat/i, "lotus"],
  [/music|concert|oud|song/i, "music"],
  [/theat|drama|perform|show/i, "mask"],
  [/dive|diving|sea|beach|surf|sail|kayak/i, "wave"],
  [/hike|hiking|mountain|climb|trek/i, "mountain"],
  [/oasis|palm|date farm|farm/i, "palm"],
  [/story|book|poet|calligraph|writing/i, "book"],
  [/football|soccer|basket|volley|run|marathon/i, "ball"],
  [/heritage|histor|fort|castle|old town|balad/i, "landmark"],
  [/desert|sun|dune/i, "sun"],
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type StampSource = {
  name: string;
  type: string;
  image?: string | null;
  stampShape?: string | null;
  stampColor?: string | null;
  stampIcon?: string | null;
};

/** Deterministic identity derived only from name + type (so the provider's live preview matches the saved stamp). */
export function autoIdentity(a: Pick<StampSource, "name" | "type" | "image">): StampIdentity {
  const signature = a.image ? SIGNATURE[a.image] : undefined;
  if (signature) return signature;
  const group = BY_TYPE[a.type] ?? BY_TYPE.Entertainment!;
  const h = hash(`${a.type}|${a.name.trim().toLowerCase()}`);
  const keyword = KEYWORDS.find(([re]) => re.test(a.name))?.[1];
  return {
    shape: STAMP_SHAPES[h % STAMP_SHAPES.length]!,
    color: group.colors[(h >>> 4) % group.colors.length]!,
    icon: keyword ?? group.icons[(h >>> 9) % group.icons.length]!,
  };
}

export function stampIdentity(a: StampSource): StampIdentity {
  const auto = autoIdentity(a);
  return {
    shape: isStampShape(a.stampShape) ? a.stampShape : auto.shape,
    color: isStampColor(a.stampColor) ? a.stampColor : auto.color,
    icon: isStampIcon(a.stampIcon) ? a.stampIcon : auto.icon,
  };
}

/** Short title that fits around the stamp ring. */
export function stampTitle(name: string) {
  let t = name
    .replace(/\s+(with|by)\s+.*$/i, "")
    .replace(/\bexperience\b\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!t) t = name.trim();
  // The place is already printed on the lower ring, so drop a trailing "in/at …" when space is tight.
  if (t.length > 26) t = t.replace(/\s+(in|at|near|on)\s+.*$/i, "") || t;
  return t.length > 30 ? `${t.slice(0, 29).trimEnd()}…` : t;
}

/** "Giza, Greater Cairo, Egypt" -> "Giza · Egypt" */
export function stampPlace(destination: string) {
  const parts = destination
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts[0]} · ${parts[parts.length - 1]}`;
}
