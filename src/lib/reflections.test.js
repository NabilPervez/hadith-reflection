import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { _resetForTests, clearReflections } from "./db.js";
import { migrateLegacy, listReflections, saveReflection, importReflections, isValidReflection } from "./reflections.js";

const book = { id: "bukhari", name: "Sahih al-Bukhari" };
const chapter = { id: 1, title: "Revelation" };
const hadith = { id: 1, englishText: "Actions are by intentions.", arabicText: "" };

const legacyEntry = (id, text = "note") => ({
  id,
  bookId: "bukhari",
  chapterId: 1,
  hadithId: 1,
  text,
  date: "2026-01-01T00:00:00.000Z",
});

beforeEach(async () => {
  localStorage.clear();
  _resetForTests();
  await clearReflections();
});

describe("saveReflection", () => {
  it("stores under a stable id and lists newest first", async () => {
    await saveReflection({ book, chapter, hadith, text: "first" });
    await saveReflection({ book, chapter, hadith: { ...hadith, id: 2 }, text: "second" });
    const list = await listReflections();
    expect(list.map((r) => r.id)).toEqual(["bukhari-1-2", "bukhari-1-1"]);
  });

  it("deletes the entry when the text is cleared", async () => {
    await saveReflection({ book, chapter, hadith, text: "first" });
    await saveReflection({ book, chapter, hadith, text: "   " });
    expect(await listReflections()).toEqual([]);
  });

  it("falls back to the Arabic text for the excerpt", async () => {
    const r = await saveReflection({ book, chapter, hadith: { id: 3, englishText: "", arabicText: "نص" }, text: "x" });
    expect(r.hadithExcerpt).toBe("نص");
  });
});

describe("migrateLegacy", () => {
  it("copies valid localStorage entries once", async () => {
    localStorage.setItem("hadith_reflections", JSON.stringify([legacyEntry("a"), { junk: true }]));
    expect(await migrateLegacy()).toBe(1);
    expect(await migrateLegacy()).toBe(0);
    expect((await listReflections()).map((r) => r.id)).toEqual(["a"]);
  });

  it("survives corrupt legacy data", async () => {
    localStorage.setItem("hadith_reflections", "{not json");
    expect(await migrateLegacy()).toBe(0);
  });
});

describe("importReflections", () => {
  it("adds new valid entries and skips duplicates and junk", async () => {
    await saveReflection({ book, chapter, hadith, text: "mine" });
    const result = await importReflections(JSON.stringify([legacyEntry("bukhari-1-1"), legacyEntry("b"), { id: 5 }]));
    expect(result).toEqual({ added: 1, skipped: 2 });
  });

  it("rejects a file that isn't a list", async () => {
    await expect(importReflections('{"a":1}')).rejects.toThrow();
  });
});

describe("isValidReflection", () => {
  it("requires text and a parseable date", () => {
    expect(isValidReflection(legacyEntry("a"))).toBe(true);
    expect(isValidReflection(legacyEntry("a", " "))).toBe(false);
    expect(isValidReflection({ ...legacyEntry("a"), date: "nope" })).toBe(false);
  });
});
