/** Optimised WebP versions of ERA's large PNG artwork (originals stay in /public). */
const OPTIMISED: Record<string, string> = {
  "/So_Matcha_Experience_Riyadh.png": "matcha",
  "/Stargazing_Experience_AlUla.png": "alula",
  "/Jeddah_Tennis.png": "jeddah",
  "/Louvre_Art_Experience_Paris.png": "louvre",
  "/Alo_Yoga_Experience_London.png": "london",
  "/Pyramids_Equestrian_Egypt.png": "giza",
};

export function optimisedImage(src: string | null | undefined, size: "lg" | "sm" = "lg") {
  if (!src) return null;
  const key = OPTIMISED[src];
  return key ? `/img/${key}${size === "sm" ? "-sm" : ""}.webp` : src;
}

export const HERO_IMAGE = "/img/hero.webp";
export const LOGO_IMAGE = "/img/era-logo.png";
