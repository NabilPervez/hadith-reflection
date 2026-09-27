// Favorited hadith ids (same shape as reflection ids), kept in localStorage.

const KEY = "hadith_favorites";

function load() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

export const isFavorite = (id) => load().has(id);

/** Flips the favorite state and returns the new value. */
export function toggleFavorite(id) {
  const set = load();
  const on = !set.has(id);
  if (on) set.add(id);
  else set.delete(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    /* storage unavailable */
  }
  return on;
}
