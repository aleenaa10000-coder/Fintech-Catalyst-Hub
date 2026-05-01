/**
 * Flesch-Kincaid readability utilities.
 *
 * All functions are pure and have no side effects so they can be called
 * freely inside render functions and useMemo callbacks.
 */

/**
 * Estimates the number of syllables in a single word using a heuristic
 * vowel-group count with a silent-e correction.
 */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w.length) return 0;
  const groups = w.match(/[aeiouy]+/g);
  let count = groups ? groups.length : 1;
  if (w.length > 2 && w.endsWith("e") && !/[aeiouy]/.test(w[w.length - 2])) {
    count = Math.max(1, count - 1);
  }
  return Math.max(1, count);
}

/**
 * Returns the Flesch-Kincaid grade level for the given text, or null
 * when there is not enough content to calculate a meaningful score.
 * HTML tags are stripped before processing.
 */
export function fleschKincaidGrade(text: string): number | null {
  if (!text || text.trim().length === 0) return null;
  const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const sentences = plain.split(/[.!?]+/).filter((s) => s.trim().length > 2);
  const words = plain
    .split(/\s+/)
    .filter((w) => w.replace(/[^a-zA-Z]/g, "").length > 0);
  if (sentences.length < 2 || words.length < 10) return null;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const grade =
    0.39 * (words.length / sentences.length) +
    11.8 * (syllables / words.length) -
    15.59;
  return Math.max(1, Math.round(grade * 10) / 10);
}

export type ReadabilityBand =
  | "elementary"
  | "middle"
  | "high"
  | "college"
  | null;

/** Maps a numeric grade to its audience band. */
export function gradeToBand(grade: number): ReadabilityBand {
  if (grade <= 5) return "elementary";
  if (grade <= 8) return "middle";
  if (grade <= 12) return "high";
  return "college";
}

/** Human-readable label for each band. */
export const BAND_LABELS: Record<NonNullable<ReadabilityBand>, string> = {
  elementary: "Elementary (≤ 5)",
  middle: "Middle school (6–8)",
  high: "High school (9–12)",
  college: "College+ (13+)",
};

/** Tailwind colour classes for each band (background + text). */
export const BAND_COLORS: Record<
  NonNullable<ReadabilityBand>,
  { bg: string; text: string; hex: string }
> = {
  elementary: { bg: "bg-green-100", text: "text-green-800", hex: "#16a34a" },
  middle: { bg: "bg-blue-100", text: "text-blue-800", hex: "#2563eb" },
  high: { bg: "bg-amber-100", text: "text-amber-800", hex: "#d97706" },
  college: { bg: "bg-red-100", text: "text-red-800", hex: "#dc2626" },
};
