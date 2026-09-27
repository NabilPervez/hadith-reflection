# AGENTS.md — Hadith Reflection

Instructions for AI coding agents (Claude Code, Cursor, Windsurf, Antigravity, Codex…).
Claude Code reads this through `CLAUDE.md`, which just imports this file.

## What this app is

A reading and journaling app: users read the major Hadith collections one narration at a time,
in Arabic and English, and keep a **private reflection journal that never leaves their device**.

- **Live site:** https://hadith-reflection.netlify.app (every push to the deployed branch
  redeploys it on Netlify).
- **Android:** a Trusted Web Activity (TWA) — a thin Android shell that opens the live site
  full-screen. So a Netlify deploy also updates the Android app. See `SETUP-ANDROID.md`.
- **Repo:** https://github.com/NabilPervez/hadith-reflection
- **This folder (`D:\Code\hadith-reflection`) is the real copy.** An older copy exists at
  `C:\Users\perve\OneDrive\Code\Claude\hadith-reflection` — don't edit that one.

## Stack

- React 19 + Vite 8, plain JavaScript (JSX), no TypeScript.
- Installable PWA via `vite-plugin-pwa` (service worker + web manifest).
- Data is stored **in the browser** with IndexedDB (`src/lib/db.js`). There is no backend
  and no user accounts.
- Tests: Vitest with jsdom and `fake-indexeddb`.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the local dev server (Vite) |
| `npm test` | Run the test suite once |
| `npm run verify` | Tests **and** a production build — run this before saying a change is done |
| `npm run build` | Production build into `dist/` |
| `npm run icons` | Regenerate every app icon and store graphic from `scripts/generate-icons.mjs` |
| `npm run twa:check` | Check the **live** site meets Android TWA requirements |

## Code map

- `src/App.jsx` — top-level app and view switching.
- `src/components/` — UI: `Reader`, `Library`, `Journal`, `Settings`, `Onboarding`, plus
  shared pieces (`Sheet`, `Toast`, `Icon`).
- `src/lib/` — logic, no UI:
  - `db.js` — IndexedDB storage.
  - `hadith.js`, `books.js` — loading hadith text and the list of collections.
  - `reflections.js` — the journal.
  - `backup.js` — export/import of the user's data.
  - `*.test.js` — tests sit next to the file they test.

## Rules

- **Privacy is a promise to users.** Journal entries must never be sent to a server, analytics
  or third-party service. Keep everything local unless I explicitly ask otherwise.
- **The app must work offline.** Hadith text is cached in IndexedDB and the app shell is
  precached. Don't add features that break offline reading.
- Add or update tests in `src/lib/*.test.js` for any logic change.
- **Don't change these without asking** — they break the Android app:
  - The package name `com.nabilpervez.hadithreflection` (in `public/.well-known/assetlinks.json`,
    `android/twa-manifest.json` and `scripts/check-twa.mjs`).
  - `public/.well-known/assetlinks.json` fingerprints.
  - The manifest's `id`, `start_url` and `scope`.
  - The `netlify.toml` headers (they stop `sw.js` being cached and serve assetlinks as JSON).
- **Never commit signing keys.** The keystore lives outside the repo at
  `C:\Users\perve\bullet-journal-android\android.keystore`.
- Sister app: `quran-reflection` uses the same patterns — keep the two consistent.
