import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}"],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "shortcut-*.png"],
      manifest: {
        // A stable identity for the installed app, independent of start_url.
        id: "/",
        name: "Hadith Reflection",
        short_name: "Hadith",
        description:
          "Read the major Hadith collections one narration at a time, in Arabic and English, and keep a private reflection journal that never leaves your device.",
        lang: "en",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        // A TWA locks to whatever this says; "any" lets tablets rotate.
        orientation: "any",
        // Matches the light reading surface so the splash screen and status
        // bar blend into the first frame.
        theme_color: "#FAFAF8",
        background_color: "#FAFAF8",
        categories: ["books", "education", "lifestyle"],
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        // Become Android long-press shortcuts in the Play build, which expects
        // each one to carry an icon.
        shortcuts: [
          {
            name: "Continue reading",
            short_name: "Continue",
            url: "/?open=resume",
            icons: [{ src: "shortcut-resume.png", sizes: "96x96", type: "image/png" }],
          },
          {
            name: "My journal",
            short_name: "Journal",
            url: "/?view=journal",
            icons: [{ src: "shortcut-journal.png", sizes: "96x96", type: "image/png" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        // The privacy page is its own document, not part of the app shell.
        globIgnores: ["privacy/**"],
        navigateFallback: "/index.html",
        // Without this, an installed copy answers /privacy with the app, and
        // Chrome's Digital Asset Links check could get the shell instead of JSON.
        navigateFallbackDenylist: [/^\/privacy/, /^\/\.well-known\//],
        cleanupOutdatedCaches: true,
        // Hadith text is stored in IndexedDB by the app itself, so the service
        // worker only needs the fonts for a fully offline launch.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
