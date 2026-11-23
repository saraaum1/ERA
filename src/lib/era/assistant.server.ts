/**
 * ERA Assistant (server only) — recommends experiences from ERA's live catalogue.
 *
 * Honesty rules, enforced in code (not just in the prompt):
 *  - The catalogue comes from the database: upcoming experiences with seats left.
 *  - Claude may only return catalogue IDs; every returned ID is checked and unknown IDs are dropped.
 *  - The cards the visitor sees (name, city, date, time, seats) are built from the database, never
 *    from the model's text, so dates, places and availability cannot be invented.
 *  - Distances are computed here from a fixed table of city coordinates, not guessed by the model.
 * With ANTHROPIC_API_KEY set it uses Claude; otherwise (or if Claude is unavailable) it uses the
 * built-in matcher below, which follows the same rules.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { db, ensurePgReady } from "./db-engine";

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type Pick = { activityId: string; reason: string };
export type AssistantReply = {
  reply: string;
  recommendations: (Pick & {
    name: string;
    type: string;
    city: string;
    destination: string;
    date: string;
    time: string;
    seatsLeft: number;
    image: string | null;
    distanceKm: number | null;
  })[];
  engine: "claude" | "local";
};

/* ---------- places (for honest distances) ---------- */
const PLACES: { keys: string[]; name: string; lat: number; lon: number }[] = [
  { keys: ["riyadh", "الرياض"], name: "Riyadh", lat: 24.71, lon: 46.68 },
  { keys: ["diriyah", "الدرعية", "درعية"], name: "Diriyah", lat: 24.74, lon: 46.58 },
  { keys: ["jeddah", "jedda", "جدة", "جده"], name: "Jeddah", lat: 21.49, lon: 39.19 },
  { keys: ["makkah", "mecca", "مكة", "مكه"], name: "Makkah", lat: 21.39, lon: 39.86 },
  { keys: ["madinah", "medina", "المدينة"], name: "Madinah", lat: 24.47, lon: 39.61 },
  { keys: ["taif", "الطائف", "طائف"], name: "Taif", lat: 21.27, lon: 40.42 },
  { keys: ["abha", "أبها", "ابها", "asir", "عسير"], name: "Abha", lat: 18.22, lon: 42.5 },
  { keys: ["alula", "al-ula", "al ula", "العلا"], name: "AlUla", lat: 26.61, lon: 37.92 },
  { keys: ["umluj", "umm lajj", "أملج", "املج"], name: "Umluj", lat: 25.02, lon: 37.27 },
  {
    keys: ["al-ahsa", "alahsa", "al ahsa", "hofuf", "الأحساء", "الاحساء", "الهفوف"],
    name: "Al-Ahsa",
    lat: 25.38,
    lon: 49.59,
  },
  {
    keys: ["dammam", "الدمام", "khobar", "الخبر", "dhahran", "الظهران"],
    name: "Dammam",
    lat: 26.43,
    lon: 50.1,
  },
  {
    keys: ["farasan", "فرسان", "jazan", "jizan", "جازان", "جيزان"],
    name: "Farasan",
    lat: 16.7,
    lon: 42.12,
  },
  { keys: ["tabuk", "تبوك"], name: "Tabuk", lat: 28.38, lon: 36.57 },
  { keys: ["hail", "حائل"], name: "Hail", lat: 27.52, lon: 41.69 },
  { keys: ["paris", "باريس"], name: "Paris", lat: 48.86, lon: 2.35 },
  { keys: ["london", "لندن"], name: "London", lat: 51.51, lon: -0.13 },
  {
    keys: ["giza", "الجيزة", "cairo", "القاهرة", "egypt", "مصر"],
    name: "Giza",
    lat: 30.01,
    lon: 31.21,
  },
];
const norm = (s: string) =>
  s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
function placeIn(text: string) {
  // Whole-word match (Arabic may carry a one-letter prefix: و ب ف ل), so "الرياضة" (sport) is not read as Riyadh.
  const t = ` ${norm(text).replace(/[.,،؛;:!?؟()"'\n]/g, " ")} `;
  const hit = (k: string) => {
    const key = norm(k).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\s[وبفل]?${key}\\s`).test(t);
  };
  return PLACES.find((p) => p.keys.some(hit)) ?? null;
}
function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(r(b.lat - a.lat) / 2) ** 2 +
    Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(h)));
}

/* ---------- catalogue ---------- */
type Experience = {
  id: string;
  name: string;
  type: string;
  description: string;
  destination: string;
  city: string;
  location: string;
  date: string;
  time: string;
  seatsLeft: number;
  image: string | null;
  distanceKm: number | null;
};
async function catalogue(userPlace: ReturnType<typeof placeIn>): Promise<Experience[]> {
  await ensurePgReady();
  const [rows] = await db().execute(
    "SELECT activityID, activityName, type, description, destination, location, `date`, `time`, availableCapacity, image FROM Activity WHERE isDeleted=FALSE AND `date` >= CURRENT_DATE AND availableCapacity > 0 ORDER BY `date`, `time`",
  );
  return (rows as Record<string, unknown>[]).map((r) => {
    const destination = String(r.destination);
    const place = placeIn(destination);
    return {
      id: String(r.activityID),
      name: String(r.activityName),
      type: String(r.type),
      description: String(r.description),
      destination,
      city: destination.split(",")[0]!.trim(),
      location: String(r.location),
      date: String(r.date).slice(0, 10),
      time: String(r.time).slice(0, 5),
      seatsLeft: Number(r.availableCapacity),
      image: r.image ? String(r.image) : null,
      distanceKm: userPlace && place ? km(userPlace, place) : null,
    };
  });
}

/* ---------- built-in matcher (free, no API key) ---------- */
const INTERESTS: { words: string[]; type?: string; boost: string[] }[] = [
  {
    words: ["sport", "active", "adventure", "رياضه", "رياضة", "مغامره", "مغامرة", "نشاط", "حركه"],
    type: "Sport",
    boost: [],
  },
  {
    words: [
      "relax",
      "calm",
      "wellness",
      "nature",
      "peace",
      "استرخاء",
      "هدوء",
      "راحه",
      "راحة",
      "طبيعه",
      "طبيعة",
    ],
    type: "Wellness",
    boost: [],
  },
  {
    words: [
      "culture",
      "heritage",
      "history",
      "art",
      "music",
      "ثقافه",
      "ثقافة",
      "تراث",
      "تاريخ",
      "فن",
      "فنون",
    ],
    type: "Entertainment",
    boost: [],
  },
  { words: ["horse", "riding", "خيل", "خيول", "فروسيه", "فروسية"], boost: ["horse", "riding"] },
  { words: ["tennis", "تنس"], boost: ["tennis"] },
  {
    words: ["dive", "diving", "sea", "coral", "غوص", "بحر", "شعاب"],
    boost: ["diving", "coral", "sea", "sail"],
  },
  {
    words: ["hike", "hiking", "walk", "mountain", "مشي", "هايكنج", "جبل", "جبال"],
    boost: ["hike", "walk", "edge"],
  },
  { words: ["coffee", "قهوه", "قهوة"], boost: ["coffee"] },
  { words: ["tea", "matcha", "ماتشا", "شاي"], boost: ["matcha"] },
  {
    words: ["stars", "astronomy", "night sky", "نجوم", "فلك", "سماء"],
    boost: ["stargazing", "stars"],
  },
  { words: ["paint", "painting", "drawing", "رسم", "لوحات"], boost: ["paint", "louvre", "qatt"] },
  { words: ["music", "oud", "موسيقى", "عود"], boost: ["oud", "music"] },
  { words: ["yoga", "pilates", "يوغا", "بيلاتس"], boost: ["yoga", "pilates"] },
  { words: ["rose", "flowers", "ورد", "زهور"], boost: ["rose"] },
  {
    words: ["dates", "palm", "farm", "تمر", "تمور", "نخل", "مزرعه", "مزرعة"],
    boost: ["date harvest", "palm", "oasis"],
  },
];
const isArabic = (s: string) => /[؀-ۿ]/.test(s);

const TYPE_AR: Record<string, string> = {
  Sport: "رياضة",
  Wellness: "استرخاء وطبيعة",
  Entertainment: "ثقافة وفنون",
};
const TYPE_EN: Record<string, string> = {
  Sport: "a sport experience",
  Wellness: "a wellness & nature experience",
  Entertainment: "a culture & art experience",
};
const NATURE = [
  "oasis",
  "stars",
  "stargazing",
  "desert",
  "sea",
  "rose",
  "edge",
  "palm",
  "coral",
  "sunset",
  "farm",
];
/** Whole-word test (Arabic words may carry a one-letter prefix و ب ف ل). */
function hasWord(text: string, word: string) {
  const key = norm(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[\\s.,،؛;:!?؟()"'])[وبفل]?(ال)?${key}($|[\\s.,،؛;:!?؟()"'])`).test(text);
}
const GREETING = /^(hi|hello|hey|salam|السلام|سلام|مرحبا|هلا|اهلا|أهلا|صباح|مساء)/i;

function localMatch(
  history: ChatTurn[],
  items: Experience[],
  userPlace: ReturnType<typeof placeIn>,
): { reply: string; picks: Pick[] } {
  const lastUser = history.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const userText = norm(
    history
      .filter((m) => m.role === "user")
      .slice(-3)
      .map((m) => m.content)
      .join(" "),
  );
  const ar = isArabic(lastUser);
  const wanted = INTERESTS.filter((i) => i.words.some((w) => hasWord(userText, w)));
  const wantsNature = ["nature", "طبيعه", "طبيعة"].some((w) => hasWord(userText, w));
  const scored = items.map((e) => {
    const hay = norm(`${e.name} ${e.description} ${e.location}`);
    let score = 0;
    const why: string[] = [];
    for (const i of wanted) {
      if (i.type && e.type === i.type) {
        score += 2;
        why.push(ar ? `من فئة ${TYPE_AR[e.type] ?? e.type}` : (TYPE_EN[e.type] ?? e.type));
      }
      if (i.boost.some((b) => hay.includes(b))) {
        score += 4;
        why.push(ar ? "يطابق اهتمامك" : "matches your interest");
      }
    }
    if (wantsNature && NATURE.some((n) => hay.includes(n))) {
      score += 3;
      why.push(ar ? "في الطبيعة" : "out in nature");
    }
    if (userPlace && e.distanceKm !== null) {
      if (e.distanceKm <= 5) {
        score += 5;
        why.push(ar ? "في مدينتك" : "in your city");
      } else if (e.distanceKm <= 80) {
        score += 4;
        why.push(
          ar ? `قريب منك (حوالي ${e.distanceKm} كم)` : `close to you (about ${e.distanceKm} km)`,
        );
      }
    }
    if (score > 0 && /saudi/i.test(e.destination)) score += 0.5; // ERA puts Saudi experiences first
    return { e, score, why: [...new Set(why)] };
  });
  const top = scored
    .filter((s) => s.score >= 1)
    .sort((a, b) => b.score - a.score || a.e.date.localeCompare(b.e.date))
    .slice(0, 3);

  const words = norm(lastUser).split(/\s+/).filter(Boolean);
  if (!wanted.length && !wantsNature && !userPlace) {
    if (words.length <= 2 || GREETING.test(norm(lastUser).trim())) {
      return {
        reply: ar
          ? "عشان أرشح لك صح: وين مدينتك، ووش تحب؟ (رياضة، استرخاء وطبيعة، ثقافة وفنون، قهوة، بحر، خيل…)"
          : "To recommend well: which city are you in, and what do you enjoy? (sport, relaxing & nature, culture & art, coffee, the sea, horses…)",
        picks: [],
      };
    }
    return {
      reply: ar
        ? "بصراحة ما عندنا حالياً فعالية متاحة بهذا النوع. المتوفر في ERA: رياضة، استرخاء وطبيعة، ثقافة وفنون — قل لي مدينتك ووش يعجبك منها وأرشح لك."
        : "Honestly, ERA doesn't have an available experience like that right now. What we offer: sport, wellness & nature, and culture & art — tell me your city and which you'd enjoy.",
      picks: [],
    };
  }
  if (!top.length) {
    return {
      reply: ar
        ? "بصراحة ما لقيت فعالية متاحة تطابق طلبك حالياً. جرّب اهتمام ثاني أو مدينة ثانية، أو تصفح كل الفعاليات."
        : "Honestly, I couldn't find an available experience that matches right now. Try another interest or city, or browse all experiences.",
      picks: [],
    };
  }
  return {
    reply: ar
      ? `هذي أنسب ${top.length === 1 ? "فعالية متاحة" : "الفعاليات المتاحة"} لك حالياً:`
      : `Here ${top.length === 1 ? "is the best available match" : "are the best available matches"} for you right now:`,
    picks: top.map((s) => ({
      activityId: s.e.id,
      reason: s.why.join(ar ? "، " : ", ") || (ar ? "خيار مناسب" : "a good fit"),
    })),
  };
}

/* ---------- Claude ---------- */
const SYSTEM = `You are "ERA Guide", the recommendation assistant of ERA — a platform for booking cultural experiences (Saudi Arabia first) where every experience gives the visitor a unique passport stamp.

Your job: understand where the visitor is and what they enjoy, then recommend the best experiences from the CATALOGUE you are given.

Strict honesty rules:
- Recommend ONLY experiences that appear in the CATALOGUE, by their exact "id". Never invent experiences, places, dates, times, prices or availability.
- The website shows each recommended experience's real name, date, time, city and seats next to your answer, so do NOT repeat dates, times or seat numbers in your text.
- Distances: only use "distanceKm" values from the catalogue. If distanceKm is null, do not state a distance.
- There are no prices in the catalogue; if asked about price, say the price is not listed on ERA yet.
- If nothing in the catalogue fits, say so plainly and suggest the closest alternatives, or recommend nothing. Never stretch a weak match into a strong one.
- If you need the visitor's city or interests to recommend well, ask one short question and recommend nothing yet.
- Questions unrelated to ERA's experiences: answer briefly that you can only help with choosing ERA experiences.

Style: reply in the visitor's language (Arabic or English; match their dialect naturally). Keep "reply" to 1–3 short sentences. Recommend at most 3 experiences, best first, each with a one-sentence reason tied to what the visitor said.`;

const Output = z.object({
  reply: z.string(),
  recommendations: z.array(z.object({ activityId: z.string(), reason: z.string() })),
});

let client: Anthropic | undefined;
async function askClaude(
  history: ChatTurn[],
  items: Experience[],
  userCity: string | null,
  today: string,
) {
  client ??= new Anthropic();
  const catalogueJson = JSON.stringify(
    items.map(
      ({
        id,
        name,
        type,
        description,
        destination,
        location,
        date,
        time,
        seatsLeft,
        distanceKm,
      }) => ({
        id,
        name,
        type,
        description,
        destination,
        location,
        date,
        time,
        seatsLeft,
        distanceKm,
      }),
    ),
  );
  const response = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(Output) },
    system: [
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
      {
        type: "text",
        text: `Today is ${today}. Visitor's detected city: ${userCity ?? "unknown"}.\nCATALOGUE (upcoming experiences with seats left):\n${catalogueJson}`,
      },
    ],
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) return null;
  return response.parsed_output;
}

/* ---------- entry point ---------- */
export async function recommend(rawHistory: ChatTurn[]): Promise<AssistantReply> {
  const history = rawHistory
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim(),
    )
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  while (history.length && history[0]!.role !== "user") history.shift();
  if (!history.length) throw new Error("Empty conversation.");

  const userPlace = placeIn(
    history
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" "),
  );
  const items = await catalogue(userPlace);
  const byId = new Map(items.map((e) => [e.id, e]));
  const d = new Date();
  const today = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");

  let engine: AssistantReply["engine"] = "local";
  let result: { reply: string; picks: Pick[] } | null = null;
  if (process.env.ANTHROPIC_API_KEY && items.length) {
    try {
      const out = await askClaude(history, items, userPlace?.name ?? null, today);
      if (out) {
        result = { reply: out.reply, picks: out.recommendations };
        engine = "claude";
      }
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError)
        console.warn("ERA Guide: Claude rate limited, using built-in matcher.");
      else if (e instanceof Anthropic.APIError)
        console.error(
          `ERA Guide: Claude API error ${e.status}, using built-in matcher.`,
          e.message,
        );
      else console.error("ERA Guide: Claude unavailable, using built-in matcher.", e);
    }
  }
  result ??= localMatch(history, items, userPlace);

  // Grounding check: keep only real, available catalogue IDs (no duplicates, max 3).
  const seen = new Set<string>();
  const recommendations = result.picks
    .filter(
      (p) =>
        byId.has(String(p.activityId)) &&
        !seen.has(String(p.activityId)) &&
        seen.add(String(p.activityId)),
    )
    .slice(0, 3)
    .map((p) => {
      const e = byId.get(String(p.activityId))!;
      return {
        activityId: e.id,
        reason: p.reason.slice(0, 300),
        name: e.name,
        type: e.type,
        city: e.city,
        destination: e.destination,
        date: e.date,
        time: e.time,
        seatsLeft: e.seatsLeft,
        image: e.image,
        distanceKm: e.distanceKm,
      };
    });
  return { reply: result.reply.slice(0, 1200), recommendations, engine };
}
