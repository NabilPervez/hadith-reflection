# Publishing Hadith Reflection on Google Play

The Android app is a **Trusted Web Activity (TWA)**: a thin shell that opens
`https://hadith-reflection.netlify.app` full-screen in Chrome. It follows the same path as Digital
Bullet Journal and Quran Reflections, so this guide covers what's specific to this app plus the
answers to paste.

Because the app loads the live site, **every Netlify deploy updates the Android app.** You only
rebuild and re-upload when the name, icon, colours or Android settings change.

---

## Already done in the repo

- [x] Web app manifest: stable `id`, root `start_url`/`scope`, `display: standalone`,
      `orientation: any`, colours matching the app, two launcher shortcuts (Continue reading, Journal).
- [x] Icon set, maskable icon inside Android's safe zone, Play icon and feature graphic
      (`npm run icons` regenerates them all from `scripts/generate-icons.mjs`).
- [x] Service worker: precaches the app shell and caches fonts; hadith text is kept in IndexedDB,
      so the app opens and reads offline. `/privacy` and `/.well-known/` stay on the network.
- [x] `netlify.toml`: builds with Vite, serves `assetlinks.json` as JSON and the manifest as
      `application/manifest+json`, never caches `sw.js`.
- [x] Privacy policy at **`/privacy/`**, linked from Settings → About.
- [x] `public/.well-known/assetlinks.json` with your **upload key** fingerprint (the same key as
      Bullet Journal and Quran Reflections). The Play app signing fingerprint is added in Part C2.
- [x] `android/twa-manifest.json`: the Bubblewrap config, ready to generate the project from.
- [x] `npm run twa:check` checks the live site against all of the above.

---

## Decisions

| Decision | Value | Can it change later? |
| --- | --- | --- |
| Package name | `com.nabilpervez.hadithreflection` (matches `com.nabilpervez.quranreflections`) | **Never, once uploaded.** If you want another, change it in `public/.well-known/assetlinks.json`, `android/twa-manifest.json` and `EXPECTED_PACKAGE` in `scripts/check-twa.mjs`. |
| App name (Play) | `Hadith Reflection` | Yes |
| Launcher name | `Hadith` (fits every launcher; `Hadith Reflection` is 17 characters and truncates) | With a new build |
| Signing key | `C:\Users\perve\bullet-journal-android\android.keystore`, alias `android` | — |
| Status bar | Light `#FAFAF8`, dark `#151412` | With a new build |

---

## Part A — Get the website live

1. Merge `feat/pwa-play-store` into `main`. Netlify builds it (`npm run build` → `dist`).
2. When the deploy finishes:

   ```bash
   npm run twa:check
   ```

   **Expected:** `✓ Ready` with one warning, "Only one fingerprint", which is correct until Part C2.

---

## Part B — Build the app

Keep the Android project **outside the repo and off the C: drive** (Gradle needs a few GB):

```bash
mkdir D:\Code\hadith-reflection-android
copy android\twa-manifest.json D:\Code\hadith-reflection-android\
cd D:\Code\hadith-reflection-android
bubblewrap update
bubblewrap build
```

`update` generates the Android project from `twa-manifest.json` (no prompts). `build` asks for
the keystore and key passwords, then writes:

- **`app-release-bundle.aab`**: upload this to Play.
- **`app-release-signed.apk`**: sideload it to your phone to test first.

If the build says `'gradlew.bat' is not recognized`, clear the variable for that shell and rebuild:

```bash
$env:NoDefaultCurrentDirectoryInExePath = $null
bubblewrap build
```

---

## Part C — Play Console

### C1. Create the app and upload

1. **Create app** → name `Hadith Reflection`, App, Free.
2. Upload `app-release-bundle.aab` to a testing track. If your account needs a closed test before
   production (12 testers for 14 days on newer personal accounts, per app), start it now, since
   it's the longest step.

### C2. Add the Play app signing fingerprint — this is what hides the address bar

1. Play Console → **Test and release → App integrity → App signing**.
2. Under **App signing key certificate** (not the upload key), copy the **SHA-256** value.
3. Add it as a second entry in `public/.well-known/assetlinks.json`:

   ```json
   "sha256_cert_fingerprints": [
     "13:36:F9:28:F5:E0:8C:50:8B:9A:18:DA:0E:1F:E0:06:F9:A9:92:9A:2E:F3:F0:65:CD:BD:E2:79:2A:58:DA:71",
     "PASTE_THE_APP_SIGNING_SHA256_HERE"
   ]
   ```

4. Commit, push, wait for the deploy, run `npm run twa:check`. The warning should be gone.

### C3. Store listing

| Field | Use |
| --- | --- |
| App icon | `store-assets/android/play-icon-512.png` |
| Feature graphic (1024×500) | `store-assets/android/feature-graphic-1024x500.png` |
| Phone screenshots (2–8) | From the installed app: Library, a hadith with its grade, the Journal, dark mode |
| Short description (≤80) | `Read hadith one narration at a time and keep a private reflection journal.` |
| Category | Books & Reference |
| Contact email | nabilpervezconsulting@gmail.com |
| Privacy policy | `https://hadith-reflection.netlify.app/privacy/` |

Full description:

> Hadith Reflection is a quiet place to read the sayings of the Prophet ﷺ, one narration at a
> time, and write down what they mean to you.
>
> • Nine collections: Sahih al-Bukhari, Sahih Muslim, Sunan Abu Dawud, Jami at-Tirmidhi, Sunan
>   an-Nasa'i, Sunan Ibn Majah, Muwatta Malik, Forty Hadith an-Nawawi and Forty Hadith Qudsi
> • Arabic text with English translation, with adjustable sizes
> • Hadith grades (Sahih, Hasan, Da'if) from the scholars who graded them
> • Swipe between narrations, jump to any chapter or hadith, and pick up where you left off
> • Reads offline once a collection is downloaded
> • Light and dark modes
> • A private journal for your reflections, searchable, with backup and restore
>
> Private by design: no account, no ads, no analytics. Your reflections are stored only on your
> device and are never uploaded.

### C4. App content forms

| Form | Answer |
| --- | --- |
| Privacy policy | `https://hadith-reflection.netlify.app/privacy/` |
| Ads | No ads |
| App access | All functionality is available without special access |
| Content rating | Reference app. No violence, no user-to-user interaction, no personal data collection. |
| Target audience | 13+ age groups (including under-13 enrols you in the Families policy and extra review) |
| Data safety | See below |
| Government / financial / health apps | No |

**Data safety:**

- *Does your app collect or share any of the required user data types?* **No.** Reflections,
  settings and downloaded books never leave the device. Requests for hadith text and fonts carry
  no user data beyond the IP address every web request carries.
- *Is data encrypted in transit?* Yes (HTTPS only).
- *Can users request deletion?* Not applicable: nothing is collected. Settings has in-app delete.

---

## If the address bar still shows

1. **The Play signing fingerprint is missing or wrong.** It must come from **App signing key
   certificate**, not the upload key. `npm run twa:check` shows how many fingerprints are live.
2. **The phone cached a failed check.** On the phone: Settings → Apps → Chrome → Storage → Clear
   cache, then uninstall and reinstall the app.
3. **Google hasn't picked up the change yet** (it caches for up to about an hour). Check what it sees:

   ```bash
   curl "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://hadith-reflection.netlify.app&relation=delegate_permission/common.handle_all_urls"
   ```
