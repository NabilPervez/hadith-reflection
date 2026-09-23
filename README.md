# Hadith Reflection

Read the major Hadith collections one narration at a time, in Arabic and English, and keep a
private reflection journal that never leaves your device. Installable as a PWA and published on
Android as a Trusted Web Activity.

**Live:** https://hadith-reflection.netlify.app

## Features

- **Library** of nine collections: Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah,
  Muwatta Malik, Nawawi's Forty and Forty Hadith Qudsi. Download size is shown before the first open.
- **Reader** with Arabic and English, scholars' grades, swipe or arrow-key navigation, a chapter
  picker, jump-to-hadith, and resume where you left off.
- **Journal**: reflections autosave as you type, are searchable, and open back to their hadith.
- **Offline**: a collection downloads once into IndexedDB; the service worker caches the app shell
  and fonts.
- **Private**: no accounts, analytics or servers. Export and import the journal as JSON.
- Light and dark themes; Android back button and launcher shortcuts behave natively.

Hadith data comes from [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api).

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run build      # production build in dist/
npm run preview    # serve dist/ to test the service worker
npm run icons      # regenerate icons and Play Store graphics
npm run twa:check  # check the live site is ready for the Android app
```

Stack: React 19, Vite, vite-plugin-pwa (Workbox). Deployed on Netlify (`netlify.toml`).

## Android

See [SETUP-ANDROID.md](SETUP-ANDROID.md) for the Bubblewrap build and Play Console steps.
