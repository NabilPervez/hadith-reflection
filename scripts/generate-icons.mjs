// Generates every icon and Play Store graphic from SVG source, so the brand
// lives in one place and can be regenerated after a design change.
//
//   npm run icons
//
// Writes:
//   public/icon-192.png, icon-512.png, icon-maskable-512.png   (web manifest)
//   public/apple-touch-icon.png, favicon.svg
//   public/shortcut-{resume,journal}.png                       (Android shortcuts)
//   store-assets/android/play-icon-512.png                     (Play listing icon, 32-bit PNG)
//   store-assets/android/feature-graphic-1024x500.png          (Play feature graphic, 24-bit PNG)
//
// Fonts for the feature graphic are downloaded from Google Fonts on first run
// into scripts/.font-cache (git-ignored). All are SIL Open Font License.

import { Resvg } from "@resvg/resvg-js";
import { mkdir, writeFile, access } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");
const store = path.join(root, "store-assets", "android");
const fontCache = path.join(root, "scripts", ".font-cache");

// Brand tokens — the same values as src/styles.css (dark theme + gold).
const INK = "#1A1917";
const INK_2 = "#262420";
const GOLD = "#C9A84C";
const GOLD_SOFT = "#E4CC85";
const CREAM = "#FAFAF8";
const MUTED = "#AAA398";

// ---------------------------------------------------------------------------
// The mark: an eight-pointed star (two squares, one turned 45°) drawn as a
// gold outline, with a small filled centre. `scale` 1 fills a 512 canvas with
// comfortable margins; the maskable variant shrinks it into Android's 80%
// safe zone so no launcher mask clips a point.
// ---------------------------------------------------------------------------

function star(scale = 1, stroke = 22) {
  const r = 150 * scale;
  const square = (rot) =>
    `<rect x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" rx="${10 * scale}" transform="rotate(${rot})" fill="none" stroke="${GOLD}" stroke-width="${stroke * scale}" stroke-linejoin="round"/>`;
  return `<g transform="translate(256 256)">
    ${square(0)}${square(45)}
    <circle r="${64 * scale}" fill="none" stroke="${GOLD_SOFT}" stroke-width="${10 * scale}"/>
    <circle r="${26 * scale}" fill="${GOLD}"/>
  </g>`;
}

function mark({ size = 512, scale = 0.95, bleed = true, rounded = false } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  ${bleed ? `<rect width="512" height="512" ${rounded ? 'rx="112"' : ""} fill="${INK}"/>` : ""}
  ${star(scale)}
</svg>`;
}

// Shortcut glyphs on a gold disc, drawn as shapes so no font is involved.
const SHORTCUT_GLYPHS = {
  resume: `<path d="M-46 -38h32a22 22 0 0 1 22 22v62a16 16 0 0 0-16-16h-38z M46 -38h-32a22 22 0 0 0-22 22v62a16 16 0 0 1 16-16h38z" fill="none" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>`,
  journal: `<path d="M-40 44h80 M22 -46a12 12 0 0 1 17 17l-62 62-23 6 6-23z" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`,
};

function shortcut(glyph) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="-128 -128 256 256">
  <circle r="128" fill="${GOLD}"/>
  <g transform="scale(1.25)">${SHORTCUT_GLYPHS[glyph]}</g>
</svg>`;
}

// ---------------------------------------------------------------------------
// Play feature graphic, 1024x500. Google may crop the edges and overlay a
// play button, so the wordmark sits well inside the frame.
// ---------------------------------------------------------------------------

function featureGraphic() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <rect width="1024" height="500" fill="${INK}"/>
  <g transform="translate(820 250) scale(1.35)" opacity="0.14">${star(1).replace('translate(256 256)', "")}</g>

  <g transform="translate(76 0)">
    <text x="0" y="150" font-family="DM Sans" font-weight="500" font-size="20" letter-spacing="4" fill="${GOLD}">READ · REFLECT · REMEMBER</text>
    <text x="0" y="236" font-family="Cormorant Garamond" font-weight="500" font-size="76" fill="${CREAM}">Hadith Reflection</text>
    <text x="0" y="300" font-family="DM Sans" font-weight="400" font-size="26" fill="${MUTED}">Nine collections, one narration at a time,</text>
    <text x="0" y="338" font-family="DM Sans" font-weight="400" font-size="26" fill="${MUTED}">with a private journal for your thoughts.</text>
  </g>

  <g transform="translate(700 88)">
    <rect width="250" height="324" rx="26" fill="${INK_2}" stroke="#3a3730" stroke-width="2"/>
    <rect x="178" y="0" width="52" height="26" rx="6" fill="${GOLD}"/>
    <g transform="translate(125 150)">${star(0.42, 26).replace('translate(256 256)', "")}</g>
    <rect x="34" y="250" width="182" height="8" rx="4" fill="#4a463d"/>
    <rect x="34" y="270" width="140" height="8" rx="4" fill="#4a463d"/>
  </g>
</svg>`;
}

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

const FONTS = [
  { file: "CormorantGaramond-500.ttf", query: "Cormorant+Garamond:wght@500" },
  { file: "DMSans-400.ttf", query: "DM+Sans:wght@400" },
  { file: "DMSans-500.ttf", query: "DM+Sans:wght@500" },
];

// An old Android user agent makes the Google Fonts CSS API answer with
// TrueType, which the renderer can read (it can't read woff/woff2).
const TTF_UA =
  "Mozilla/5.0 (Linux; U; Android 2.2; en-us; Nexus One Build/FRF91) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1";

async function ensureFonts() {
  await mkdir(fontCache, { recursive: true });
  const paths = [];
  for (const font of FONTS) {
    const target = path.join(fontCache, font.file);
    try {
      await access(target);
    } catch {
      const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${font.query}`, { headers: { "User-Agent": TTF_UA } })).text();
      const url = css.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
      if (!url) throw new Error(`No TrueType URL for ${font.query}`);
      await writeFile(target, Buffer.from(await (await fetch(url)).arrayBuffer()));
      console.log(`  fetched ${font.file}`);
    }
    paths.push(target);
  }
  return paths;
}

// ---------------------------------------------------------------------------
// PNG output. Play wants the listing icon as 32-bit (with alpha) and the
// feature graphic as 24-bit (no alpha), so the encoder can drop the alpha
// channel itself rather than needing another image library.
// ---------------------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgba, width, height, { alpha }) {
  const channels = alpha ? 4 : 3;
  const raw = Buffer.alloc((width * channels + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * channels + 1);
    raw[row] = 0; // no filter
    for (let x = 0; x < width; x += 1) {
      const src = (y * width + x) * 4;
      const dst = row + 1 + x * channels;
      raw[dst] = rgba[src];
      raw[dst + 1] = rgba[src + 1];
      raw[dst + 2] = rgba[src + 2];
      if (alpha) raw[dst + 3] = rgba[src + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = alpha ? 6 : 2; // RGBA : RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function render(svg, file, { width, alpha = true, fontFiles = [] }) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: "DM Sans" },
  });
  const image = resvg.render();
  await writeFile(file, encodePng(image.pixels, image.width, image.height, { alpha }));
  console.log(`  ${path.relative(root, file)}  ${image.width}x${image.height}  ${alpha ? "RGBA" : "RGB"}`);
}

// ---------------------------------------------------------------------------

await mkdir(store, { recursive: true });

console.log("Web app icons");
await render(mark(), path.join(pub, "icon-512.png"), { width: 512 });
await render(mark(), path.join(pub, "icon-192.png"), { width: 192 });
await render(mark({ scale: 0.72 }), path.join(pub, "icon-maskable-512.png"), { width: 512 });
await render(mark(), path.join(pub, "apple-touch-icon.png"), { width: 180 });
await writeFile(path.join(pub, "favicon.svg"), mark({ size: 64, rounded: true }));
console.log("  public/favicon.svg");

console.log("Shortcut icons");
for (const glyph of Object.keys(SHORTCUT_GLYPHS)) {
  await render(shortcut(glyph), path.join(pub, `shortcut-${glyph}.png`), { width: 96 });
}

console.log("Play Store listing");
await render(mark(), path.join(store, "play-icon-512.png"), { width: 512, alpha: true });
const fontFiles = await ensureFonts();
await render(featureGraphic(), path.join(store, "feature-graphic-1024x500.png"), { width: 1024, alpha: false, fontFiles });
