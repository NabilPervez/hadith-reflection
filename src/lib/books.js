// The collections the library offers. `mb` is the combined English + Arabic
// download, shown before the first open so nobody burns 14 MB of mobile data
// by accident. Sizes come from the minified editions on the CDN.

export const BOOKS = [
  { id: "bukhari", name: "Sahih al-Bukhari", author: "Imam al-Bukhari", tag: "Most authentic", mb: 14.2 },
  { id: "muslim", name: "Sahih Muslim", author: "Imam Muslim", tag: "Second most authentic", mb: 12.3 },
  { id: "abudawud", name: "Sunan Abu Dawud", author: "Imam Abu Dawud", tag: "Legal traditions", mb: 10.2 },
  { id: "tirmidhi", name: "Jami at-Tirmidhi", author: "Imam at-Tirmidhi", tag: "Comprehensive", mb: 9.2 },
  { id: "nasai", name: "Sunan an-Nasa'i", author: "Imam an-Nasa'i", tag: "Sunan collection", mb: 9.8 },
  { id: "ibnmajah", name: "Sunan Ibn Majah", author: "Imam Ibn Majah", tag: "Sunan collection", mb: 7.6 },
  { id: "malik", name: "Muwatta Malik", author: "Imam Malik", tag: "Earliest collection", mb: 3.5 },
  { id: "nawawi", name: "Forty Hadith an-Nawawi", author: "Imam an-Nawawi", tag: "Essential forty", mb: 0.1 },
  { id: "qudsi", name: "Forty Hadith Qudsi", author: "Compiled collection", tag: "Words of Allah", mb: 0.1 },
];

export const bookById = (id) => BOOKS.find((b) => b.id === id);

export function formatSize(mb) {
  return mb < 1 ? "< 1 MB" : `${Math.round(mb)} MB`;
}
