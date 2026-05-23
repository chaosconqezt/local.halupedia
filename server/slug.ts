/**
 * Canonical slug normalization. Used by router, API, and post-cache href rewriting.
 * Must be deterministic and idempotent: slugify(slugify(x)) === slugify(x).
 */
export function slugify(input: string): string {
  let s = input.trim();
  // Decode URL if it was encoded (e.g. %20 -> space), just in case we receive encoded inputs
  try {
    s = decodeURIComponent(s);
  } catch (e) {
    // Ignore malformed URIs
  }
  return s
    .replace(/\s+/g, "_") // spaces to underscores
    .replace(/["<>#%{}|\\^~[\]`]/g, "") // remove characters that are problematic in URLs/titles
    .slice(0, 200);
}

/**
 * Convert a slug back into a plausible human title.
 * "Римская_империя" -> "Римская империя"
 */
export function slugToTitle(slug: string): string {
  try {
    slug = decodeURIComponent(slug);
  } catch (e) {
    // ignore
  }
  return slug.replace(/_/g, " ");
}
