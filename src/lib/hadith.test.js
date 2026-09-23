import { describe, it, expect } from "vitest";
import { buildChapters, buildHadiths, hadithsInChapter, gradeTone } from "./hadith.js";

describe("buildChapters", () => {
  it("drops the empty section 0 and sections with no hadith range", () => {
    const chapters = buildChapters({
      sections: { 0: "", 1: "Revelation", 2: "Belief", 3: "Orphan" },
      section_details: {
        0: { hadithnumber_first: 0, hadithnumber_last: 0 },
        1: { hadithnumber_first: 1, hadithnumber_last: 7 },
        2: { hadithnumber_first: 8, hadithnumber_last: 58 },
        3: { hadithnumber_first: 0, hadithnumber_last: 0 },
      },
    });
    expect(chapters).toEqual([
      { id: 1, title: "Revelation", hadithFirst: 1, hadithLast: 7 },
      { id: 2, title: "Belief", hadithFirst: 8, hadithLast: 58 },
    ]);
  });

  it("accepts the singular key variants some editions use", () => {
    const chapters = buildChapters({
      section: { 1: "Forty Hadith" },
      section_detail: { 1: { hadithnumber_first: 1, hadithnumber_last: 42 } },
    });
    expect(chapters).toHaveLength(1);
  });
});

describe("buildHadiths", () => {
  const english = {
    hadiths: [
      { hadithnumber: 1, text: " Actions are by intentions. ", grades: [{ name: "Al-Albani", grade: "Sahih " }], reference: { book: 1, hadith: 1 } },
      { hadithnumber: 2, text: "", grades: [], reference: { book: 1, hadith: 2 } },
      { hadithnumber: 3, text: "", grades: [] },
    ],
  };
  const arabic = { hadiths: [{ hadithnumber: 1, text: "إنما الأعمال" }, { hadithnumber: 2, text: "نص عربي" }] };

  it("pairs Arabic by number, trims text and keeps grades", () => {
    const [first] = buildHadiths(english, arabic, "Sahih al-Bukhari");
    expect(first).toEqual({
      id: 1,
      englishText: "Actions are by intentions.",
      arabicText: "إنما الأعمال",
      citation: "Sahih al-Bukhari, Hadith 1",
      grades: [{ name: "Al-Albani", grade: "Sahih" }],
      ref: { book: 1, hadith: 1 },
    });
  });

  it("keeps Arabic-only narrations and drops ones with no text at all", () => {
    const list = buildHadiths(english, arabic, "X");
    expect(list.map((h) => h.id)).toEqual([1, 2]);
    expect(list[1].englishText).toBe("");
  });

  it("works when the Arabic edition failed to load", () => {
    expect(buildHadiths(english, null, "X").map((h) => h.id)).toEqual([1]);
  });
});

describe("hadithsInChapter", () => {
  it("includes both ends of the range, including decimal numbers", () => {
    const list = [1, 2, 2.1, 3, 4].map((id) => ({ id }));
    expect(hadithsInChapter(list, { hadithFirst: 2, hadithLast: 3 }).map((h) => h.id)).toEqual([2, 2.1, 3]);
  });
});

describe("gradeTone", () => {
  it.each([
    ["Sahih", "sound"],
    ["Hasan Sahih", "sound"],
    ["Hasan", "good"],
    ["Da'if", "weak"],
    ["Daif Jiddan", "weak"],
    ["Hasan (Weak chain)", "weak"],
    ["Maudu", "weak"],
    ["Mauquf", "neutral"],
  ])("%s → %s", (grade, tone) => expect(gradeTone(grade)).toBe(tone));
});
