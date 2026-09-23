// Checks a deployed copy of the app against what a Trusted Web Activity and
// the Play Store need. Run it after every deploy that touches the manifest,
// icons, service worker, privacy page or Digital Asset Links:
//
//   npm run twa:check
//   npm run twa:check -- http://localhost:4173     (a local `vite preview` build)
//
// Exit code is 1 if anything required is wrong, so it can gate a release.

const DEFAULT_ORIGIN = "https://hadith-reflection.netlify.app";
const EXPECTED_PACKAGE = "com.nabilpervez.hadithreflection";

const origin = (process.argv[2] || DEFAULT_ORIGIN).replace(/\/+$/, "");
let failures = 0;
let warnings = 0;

const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg) => {
  failures += 1;
  console.log(`  ✗ ${msg}`);
};
const warn = (msg) => {
  warnings += 1;
  console.log(`  ! ${msg}`);
};
const section = (title) => console.log(`\n${title}`);

async function get(pathname, init) {
  const url = new URL(pathname, origin + "/").href;
  try {
    const res = await fetch(url, { redirect: "follow", ...init });
    return { res, url, type: res.headers.get("content-type") || "" };
  } catch (error) {
    return { res: null, url, type: "", error };
  }
}

function pngSize(buffer) {
  const b = Buffer.from(buffer);
  if (b.length < 24 || b.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

console.log(`Checking ${origin}`);

// ---------------------------------------------------------------------------
section("1. HTTPS");
const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
if (isLocal) warn("Local build: HTTPS and Netlify headers only mean something against the deployed site");
else if (!origin.startsWith("https://")) bad("Origin must be https:// — a TWA will not verify over plain HTTP");
const home = await get("/");
if (!home.res) bad(`Could not reach the site: ${home.error?.message}`);
else if (home.res.ok) ok(`${home.url} answers ${home.res.status}`);
else bad(`${home.url} answers ${home.res.status}`);
const html = home.res ? await home.res.text() : "";

// ---------------------------------------------------------------------------
section("2. Web app manifest");
const manifestHref = html.match(/<link[^>]+rel=["']manifest["'][^>]*href=["']([^"']+)["']/i)?.[1];
let manifest = null;
if (!manifestHref) {
  bad("index.html has no <link rel=\"manifest\">");
} else {
  const m = await get(manifestHref);
  if (!m.res?.ok) {
    bad(`Manifest ${m.url} answers ${m.res?.status}`);
  } else {
    ok(`Manifest at ${m.url}  ← use this URL for bubblewrap init`);
    if (/manifest\+json|application\/json/.test(m.type)) ok(`Served as ${m.type}`);
    else warn(`Served as "${m.type}" — should be application/manifest+json`);
    try {
      manifest = JSON.parse(await m.res.text());
    } catch {
      bad("Manifest is not valid JSON");
    }
  }
}

if (manifest) {
  for (const field of ["name", "short_name", "start_url", "display", "theme_color", "background_color"]) {
    if (manifest[field]) ok(`${field}: ${JSON.stringify(manifest[field])}`);
    else bad(`${field} is missing`);
  }
  if (manifest.display !== "standalone") bad(`display is "${manifest.display}", expected "standalone"`);
  if (manifest.short_name && manifest.short_name.length > 12) {
    warn(`short_name "${manifest.short_name}" is ${manifest.short_name.length} characters; Android may truncate launcher labels over ~12`);
  }
  if (manifest.id) ok(`id: ${JSON.stringify(manifest.id)}`);
  else warn("id is missing");

  // start_url and scope must sit at the origin root for a TWA over the whole site.
  const start = new URL(manifest.start_url || "/", origin + "/");
  const scope = new URL(manifest.scope || "/", origin + "/");
  if (start.origin !== origin) bad(`start_url resolves to another origin: ${start.href}`);
  if (scope.pathname !== "/") warn(`scope is ${scope.pathname}; pages outside it will open with a browser bar`);
  else ok("scope is the site root");
  if (!start.pathname.startsWith(scope.pathname)) bad("start_url is outside scope");

  if (manifest.orientation && manifest.orientation !== "any") {
    warn(`orientation is "${manifest.orientation}" — the Android app will be locked to it, including on tablets`);
  }

  const icons = manifest.icons || [];
  const want = [
    { size: "192x192", purpose: "any" },
    { size: "512x512", purpose: "any" },
    { size: "512x512", purpose: "maskable" },
  ];
  for (const need of want) {
    const icon = icons.find(
      (i) => (i.sizes || "").split(/\s+/).includes(need.size) && (i.purpose || "any").split(/\s+/).includes(need.purpose)
    );
    if (!icon) {
      (need.purpose === "maskable" ? warn : bad)(`No ${need.purpose} icon at ${need.size}`);
      continue;
    }
    const r = await get(icon.src);
    const size = r.res?.ok ? pngSize(await r.res.arrayBuffer()) : null;
    const [w, h] = need.size.split("x").map(Number);
    if (!r.res?.ok) bad(`${need.purpose} ${need.size} icon ${icon.src} answers ${r.res?.status}`);
    else if (!size) bad(`${icon.src} is not a PNG`);
    else if (size.width !== w || size.height !== h) bad(`${icon.src} declares ${need.size} but is ${size.width}x${size.height}`);
    else ok(`${need.purpose} icon ${icon.src} is a real ${size.width}x${size.height} PNG`);
  }

  for (const shortcut of manifest.shortcuts || []) {
    if (!shortcut.icons?.length) warn(`Shortcut "${shortcut.name}" has no icon; Bubblewrap may leave it out`);
  }
}

// ---------------------------------------------------------------------------
section("3. Service worker");
const registers = /registerSW\.js|serviceWorker\.register/.test(html);
if (registers) ok("index.html registers a service worker");
else bad("index.html does not appear to register a service worker");
const sw = await get("/sw.js");
if (sw.res?.ok && /javascript/.test(sw.type)) {
  const body = await sw.res.text();
  ok("/sw.js is served as JavaScript");
  if (/precacheAndRoute/.test(body)) ok("Workbox precache is in place");
  else bad("sw.js has no precache — the app won't open offline");
  if (/NavigationRoute/.test(body)) ok("Offline navigation falls back to the app shell");
  else warn("No navigation fallback — deep links may fail offline");
  if (/index.html/.test(body)) ok("Navigations fall back to index.html");
  else bad("Navigation fallback isn't index.html — deep links won't open offline");
  if (/privacy/.test(body)) ok("Service worker leaves /privacy to the network");
  else warn("Service worker may answer /privacy with the app shell");
  if (/well-known/.test(body)) ok("Service worker keeps /.well-known on the network");
  else warn("Service worker may answer /.well-known with the app shell");
  const cache = sw.res.headers.get("cache-control") || "";
  if (/no-cache|max-age=0/.test(cache)) ok(`sw.js Cache-Control: ${cache}`);
  else warn(`sw.js Cache-Control is "${cache}" — updates may be slow to reach installed apps`);
} else {
  bad(`/sw.js answers ${sw.res?.status} (${sw.type})`);
}

// ---------------------------------------------------------------------------
section("4. Digital Asset Links");
const links = await get("/.well-known/assetlinks.json");
if (!links.res?.ok) {
  bad(`/.well-known/assetlinks.json answers ${links.res?.status}`);
} else if (!/application\/json/.test(links.type)) {
  bad(`Served as "${links.type}" — must be application/json. (text/html here means the app's catch-all rewrite answered instead of the file.)`);
} else {
  ok("Served as application/json");
  let statements = null;
  try {
    statements = JSON.parse(await links.res.text());
  } catch {
    bad("assetlinks.json is not valid JSON");
  }
  const statement = Array.isArray(statements)
    ? statements.find((s) => s?.target?.namespace === "android_app")
    : null;
  if (!statement) {
    bad("No android_app statement found");
  } else {
    if (statement.relation?.includes("delegate_permission/common.handle_all_urls")) ok("Relation is handle_all_urls");
    else bad("Relation must include delegate_permission/common.handle_all_urls");

    const pkg = statement.target.package_name;
    if (pkg === EXPECTED_PACKAGE) ok(`package_name: ${pkg}`);
    else warn(`package_name is ${pkg}; the guide assumes ${EXPECTED_PACKAGE} — it must match the app exactly`);

    const prints = statement.target.sha256_cert_fingerprints || [];
    const real = prints.filter((p) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(p));
    const placeholders = prints.filter((p) => /REPLACE/.test(p));
    if (placeholders.length) bad(`${placeholders.length} fingerprint placeholder(s) still need replacing — the app will show a browser bar until they are`);
    for (const p of prints) {
      if (!/REPLACE/.test(p) && !/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(p)) bad(`Malformed fingerprint "${p}" (expect 32 uppercase hex pairs joined by colons)`);
    }
    if (real.length >= 2) ok(`${real.length} well-formed SHA-256 fingerprints`);
    else if (real.length === 1) warn("Only one fingerprint. With Play App Signing you need both the upload key and the app signing key.");
  }
}

// ---------------------------------------------------------------------------
section("5. Privacy policy");
{
  const r = await get("/privacy/");
  const body = r.res?.ok ? await r.res.text() : "";
  if (!r.res?.ok) bad(`/privacy/ answers ${r.res?.status}`);
  else if (!r.type.includes("text/html")) bad(`/privacy/ is served as "${r.type}"`);
  else if (/Privacy Policy/.test(body) && /Effective/.test(body)) ok(`${r.url} is the privacy policy  ← use this URL in Play Console`);
  else bad("/privacy/ answers, but it isn't the privacy policy (the SPA rewrite may be shadowing it)");
}

// ---------------------------------------------------------------------------
console.log(`\n${failures ? `✗ ${failures} problem(s)` : "✓ Ready"}${warnings ? `, ${warnings} warning(s)` : ""}`);
process.exit(failures ? 1 : 0);
