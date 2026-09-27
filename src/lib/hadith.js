// Turns the hadith-api editions (github.com/fawazahmed0/hadith-api) into the
// shape the app reads, and downloads a book into IndexedDB.

import { getBook, putBook } from "./db.js";

// jsDelivr first: it's a CDN with proper caching and is ~2x faster than
// raw.githubusercontent.com, which stays as the fallback.
const SOURCES = [
  "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions",
  "https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions",
];

// Bump when the cached record's shape changes. Older records still open
// (offline reading never breaks) but are refreshed the next time the book is
// opened online. v2 added grades and in-book references.
export const SCHEMA = 2;

export function buildChapters(metadata) {
  const titles = metadata.sections || metadata.section || {};
  const details = metadata.section_details || metadata.section_detail || {};
  return Object.entries(titles)
    .filter(([, title]) => title?.trim())
    .map(([key, title]) => {
      const d = details[key] || {};
      return {
        id: parseInt(key, 10),
        title: title.trim(),
        hadithFirst: d.hadithnumber_first || 0,
        hadithLast: d.hadithnumber_last || 0,
      };
    })
    .filter((c) => c.hadithFirst > 0 && c.hadithLast >= c.hadithFirst);
}

export function buildHadiths(english, arabic, bookName) {
  const arabicByNumber = new Map();
  for (const h of arabic?.hadiths || []) arabicByNumber.set(h.hadithnumber, h.text);
  return english.hadiths
    .map((h) => ({
      id: h.hadithnumber,
      englishText: (h.text || "").trim(),
      arabicText: (arabicByNumber.get(h.hadithnumber) || "").trim(),
      citation: `${bookName}, Hadith ${h.hadithnumber}`,
      grades: (h.grades || []).filter((g) => g?.grade).map((g) => ({ name: g.name, grade: g.grade.trim() })),
      ref: h.reference?.book ? { book: h.reference.book, hadith: h.reference.hadith } : null,
    }))
    .filter((h) => h.englishText || h.arabicText);
}

export function hadithsInChapter(hadiths, chapter) {
  return hadiths.filter((h) => h.id >= chapter.hadithFirst && h.id <= chapter.hadithLast);
}

// Grades arrive as free text from several scholars ("Hasan Sahih", "Da'if",
// "Sahih Mauquf"…). Collapse them to a tone for the chip colour; the full text
// is always shown next to it.
export function gradeTone(grade = "") {
  const g = grade.toLowerCase();
  if (/da.?if|daeef|weak|maudu|mawdu|fabricat|munkar|shadh|very weak/.test(g)) return "weak";
  if (/sahih|saheeh/.test(g)) return "sound";
  if (/hasan/.test(g)) return "good";
  return "neutral";
}

async function fetchJson(file, onBytes) {
  let lastError;
  for (const base of SOURCES) {
    try {
      const res = await fetch(`${base}/${file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body || !onBytes) return await res.json();
      // Stream so the progress bar moves during a multi-megabyte download.
      const reader = res.body.getReader();
      const chunks = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        onBytes(value.length);
      }
      return JSON.parse(new TextDecoder().decode(await new Blob(chunks).arrayBuffer()));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/**
 * Returns { chapters, hadiths, fromCache }. Serves the cached copy whenever
 * one exists — hadith text doesn't change, so there's no time-based expiry —
 * and only re-downloads an out-of-date schema when the network is there.
 */
export async function loadBook(book, { onProgress } = {}) {
  const cached = await getBook(book.id);
  const current = cached && (cached.schema || 1) >= SCHEMA;
  if (cached && (current || !navigator.onLine)) {
    return { chapters: cached.chapters, hadiths: cached.hadiths, fromCache: true };
  }

  const total = book.mb * 1024 * 1024;
  let received = 0;
  const onBytes = (n) => {
    received += n;
    onProgress?.(Math.min(0.99, received / total));
  };

  try {
    const [english, arabic] = await Promise.all([
      fetchJson(`eng-${book.id}.min.json`, onBytes),
      fetchJson(`ara-${book.id}.min.json`, onBytes).catch(() => null),
    ]);
    const chapters = buildChapters(english.metadata);
    const hadiths = buildHadiths(english, arabic, book.name);
    await putBook({ bookId: book.id, chapters, hadiths, fetchedAt: Date.now(), schema: SCHEMA });
    onProgress?.(1);
    return { chapters, hadiths, fromCache: false };
  } catch (error) {
    // An old-schema copy is still readable; better than an error screen.
    if (cached) return { chapters: cached.chapters, hadiths: cached.hadiths, fromCache: true };
    throw error;
  }
}
