/** Arabic names for ERA destinations (used as an elegant bilingual accent). */
const ARABIC: Record<string, string> = {
  riyadh: "الرياض",
  diriyah: "الدرعية",
  alula: "العلا",
  "al-ula": "العلا",
  jeddah: "جدة",
  umluj: "أملج",
  "al-ahsa": "الأحساء",
  alahsa: "الأحساء",
  abha: "أبها",
  taif: "الطائف",
  makkah: "مكة",
  madinah: "المدينة",
  dammam: "الدمام",
  hail: "حائل",
  tabuk: "تبوك",
  najran: "نجران",
  neom: "نيوم",
  jazan: "جازان",
  farasan: "فرسان",
  paris: "باريس",
  london: "لندن",
  giza: "الجيزة",
  cairo: "القاهرة",
};
export const city = (destination: string) => destination.split(",")[0]!.trim();
export const arabicCity = (destination: string) =>
  ARABIC[city(destination).toLowerCase().replace(/\s+/g, "")] ??
  ARABIC[city(destination).toLowerCase()] ??
  null;
export const isSaudi = (a: { destination: string }) =>
  /saudi arabia|ksa|المملكة|السعودية/i.test(a.destination);
/** Saudi experiences first, then upcoming before past, then by date. */
export function saudiFirst<T extends { destination: string; date: string; time: string }>(
  list: T[],
  today: string,
): T[] {
  return [...list].sort(
    (x, y) =>
      Number(x.date < today) - Number(y.date < today) ||
      Number(!isSaudi(x)) - Number(!isSaudi(y)) ||
      `${x.date}${x.time}`.localeCompare(`${y.date}${y.time}`),
  );
}
