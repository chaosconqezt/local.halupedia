/**
 * Canonical slug normalization. Used by router, API, and post-cache href rewriting.
 * Must be deterministic and idempotent: slugify(slugify(x)) === slugify(x).
 */
const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
  А: "a", Б: "b", В: "v", Г: "g", Д: "d", Е: "e", Ё: "yo", Ж: "zh",
  З: "z", И: "i", Й: "y", К: "k", Л: "l", М: "m", Н: "n", О: "o",
  П: "p", Р: "r", С: "s", Т: "t", У: "u", Ф: "f", Х: "h", Ц: "ts",
  Ч: "ch", Ш: "sh", Щ: "sch", Ъ: "", Ы: "y", Ь: "", Э: "e", Ю: "yu",
  Я: "ya"
};

export function transliterate(text: string): string {
  return text.split('').map(char => CYRILLIC_MAP[char] !== undefined ? CYRILLIC_MAP[char] : char).join('');
}

export function slugify(input: string): string {
  return transliterate(input)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .toLowerCase()
    .replace(/['"`’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

/**
 * Convert a slug back into a plausible human title.
 * "the-glass-bishops-of-novgorod-1247" -> "The Glass Bishops of Novgorod 1247"
 * The LLM can reshape punctuation (commas etc.) as it sees fit.
 */
export function slugToTitle(slug: string): string {
  const small = new Set([
    "a", "an", "and", "as", "at", "but", "by", "for", "in", "of",
    "on", "or", "the", "to", "vs", "via", "with",
  ]);
  const words = slug.split("-").filter(Boolean);
  return words
    .map((w, i) => {
      if (i !== 0 && small.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}
