// IndexedDB storage. The database name and stores are unchanged from v2 of the
// app so existing installs keep their cached books and reflections.

const DB_NAME = "hadith-db-v3";
let dbPromise = null;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("books")) db.createObjectStore("books", { keyPath: "bookId" });
        if (!db.objectStoreNames.contains("reflections")) db.createObjectStore("reflections", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

async function run(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const getBook = (id) => run("books", "readonly", (s) => s.get(id)).catch(() => undefined);
export const putBook = (record) => run("books", "readwrite", (s) => s.put(record));
export const deleteBook = (id) => run("books", "readwrite", (s) => s.delete(id));
export const clearBooks = () => run("books", "readwrite", (s) => s.clear());

// Summaries only, walked with a cursor so at most one book (up to ~20 MB for
// Bukhari) is in memory at a time rather than all of them at once.
export async function listBooks() {
  const db = await open();
  return new Promise((resolve, reject) => {
    const out = [];
    const tx = db.transaction("books", "readonly");
    tx.objectStore("books").openCursor().onsuccess = (e) => {
      const cursor = e.target.result;
      if (!cursor) return;
      const b = cursor.value;
      out.push({ bookId: b.bookId, chapterCount: b.chapters.length, hadithCount: b.hadiths.length, fetchedAt: b.fetchedAt });
      cursor.continue();
    };
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
  });
}

export const getAllReflections = () => run("reflections", "readonly", (s) => s.getAll());
export const putReflection = (r) => run("reflections", "readwrite", (s) => s.put(r));
export const deleteReflection = (id) => run("reflections", "readwrite", (s) => s.delete(id));
export const clearReflections = () => run("reflections", "readwrite", (s) => s.clear());

export async function putReflections(list) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("reflections", "readwrite");
    const store = tx.objectStore("reflections");
    for (const r of list) store.put(r);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Tests only.
export function _resetForTests() {
  dbPromise = null;
}
