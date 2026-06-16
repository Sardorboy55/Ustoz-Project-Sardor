/**
 * The UI is fully translated (next-intl), but DB content (category & subject
 * names) only has uz/ru columns. This maps that finite set to English so the
 * /en site shows English content instead of falling back to Uzbek.
 *
 * Free-text content (teacher headlines / bios) has no mapping and stays uz on
 * /en — that needs real `*_en` columns in the database.
 */
const EN_BY_UZ: Record<string, string> = {
  // Categories
  Tillar: "Languages",
  "Maktab fanlari": "School subjects",
  "IT va dasturlash": "IT & programming",
  "Psixologiya va kouching": "Psychology & coaching",
  "Biznes va moliya": "Business & finance",
  "Ijod va musiqa": "Arts & music",
  "Sport va salomatlik": "Sports & health",
  Boshqa: "Other",
  // Subjects
  "1C": "1C",
  "Arab tili": "Arabic",
  Biologiya: "Biology",
  "Boshqa yo'nalish": "Other",
  Buxgalteriya: "Accounting",
  Dizayn: "Design",
  "DTM tayyorlov": "DTM prep",
  Excel: "Excel",
  Fitnes: "Fitness",
  Fizika: "Physics",
  Fortepiano: "Piano",
  Fotografiya: "Photography",
  "Fransuz tili": "French",
  Gitara: "Guitar",
  "IELTS tayyorlov": "IELTS prep",
  "Ingliz tili": "English",
  "Karyera kouchi": "Career coaching",
  Kimyo: "Chemistry",
  "Koreys tili": "Korean",
  Marketing: "Marketing",
  Matematika: "Mathematics",
  "Mobil dasturlash": "Mobile development",
  "Nemis tili": "German",
  "O'zbek tili": "Uzbek",
  "Oilaviy psixolog": "Family psychology",
  "Psixolog maslahati": "Psychology counseling",
  Python: "Python",
  Rasm: "Drawing",
  "Rus tili": "Russian",
  "SAT tayyorlov": "SAT prep",
  "Sog'lom ovqatlanish": "Healthy nutrition",
  Soliqlar: "Taxes",
  Sotuv: "Sales",
  Tarix: "History",
  "Turk tili": "Turkish",
  "Veb-dasturlash": "Web development",
  Vokal: "Vocals",
  "Xitoy tili": "Chinese",
  Yoga: "Yoga",
};

/** Localize a single content name. en falls back to the uz value if unmapped. */
export function localizeContent(locale: string, uz: string, ru: string): string {
  if (locale === "ru") return ru;
  if (locale === "en") return EN_BY_UZ[uz] ?? uz;
  return uz;
}

/** Localize a list of content names (e.g. a teacher's subjects). */
export function localizeList(locale: string, uz: string[], ru: string[]): string[] {
  if (locale === "ru") return ru;
  if (locale === "en") return uz.map((s) => EN_BY_UZ[s] ?? s);
  return uz;
}
