// Reflections live in IndexedDB. v2 of the app also mirrored them into
// localStorage and read from there whenever IndexedDB came back empty, which
// made deletions reappear. v3 migrates that copy once, then uses IndexedDB only.

import { getAllReflections, putReflection, putReflections, deleteReflection, clearReflections } from "./db.js";

const LEGACY_KEY = "hadith_reflections";
const MIGRATED_KEY = "hadith_reflections_migrated";

export const reflectionId = (bookId, chapterId, hadithId) => `${bookId}-${chapterId}-${hadithId}`;

export function isValidReflection(r) {
  return (
    r !== null &&
    typeof r === "object" &&
    typeof r.id === "string" &&
    typeof r.bookId === "string" &&
    typeof r.text === "string" &&
    r.text.trim().length > 0 &&
    r.chapterId !== undefined &&
    r.hadithId !== undefined &&
    !Number.isNaN(new Date(r.date).getTime())
  );
}

export async function migrateLegacy() {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return 0;
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
    const existing = new Set((await getAllReflections()).map((r) => r.id));
    const toAdd = Array.isArray(legacy) ? legacy.filter((r) => isValidReflection(r) && !existing.has(r.id)) : [];
    if (toAdd.length) await putReflections(toAdd);
    // The legacy key is left in place as a backup; it's just never read again.
    localStorage.setItem(MIGRATED_KEY, "1");
    return toAdd.length;
  } catch {
    return 0;
  }
}

export async function listReflections() {
  const all = await getAllReflections();
  return all.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function saveReflection({ book, chapter, hadith, text }) {
  const id = reflectionId(book.id, chapter.id, hadith.id);
  // Clearing the box deletes the entry, so the journal never holds blanks.
  if (!text.trim()) {
    await deleteReflection(id);
    return null;
  }
  const excerpt = hadith.englishText || hadith.arabicText;
  const record = {
    id,
    bookId: book.id,
    chapterId: chapter.id,
    hadithId: hadith.id,
    text,
    date: new Date().toISOString(),
    hadithExcerpt: excerpt.length > 140 ? `${excerpt.slice(0, 140).trimEnd()}…` : excerpt,
    bookName: book.name,
    chapterTitle: chapter.title,
  };
  await putReflection(record);
  return record;
}

export { deleteReflection, clearReflections, putReflection };

/** Merges a backup file's entries, skipping invalid ones and ids already present. */
export async function importReflections(json) {
  const data = JSON.parse(json);
  if (!Array.isArray(data)) throw new Error("Not a journal backup");
  const existing = new Set((await getAllReflections()).map((r) => r.id));
  const valid = data.filter(isValidReflection);
  const fresh = valid.filter((r) => !existing.has(r.id));
  if (fresh.length) await putReflections(fresh);
  return { added: fresh.length, skipped: data.length - fresh.length };
}
