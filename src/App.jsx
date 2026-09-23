import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Icon from "./components/Icon.jsx";
import Library from "./components/Library.jsx";
import Reader from "./components/Reader.jsx";
import Journal from "./components/Journal.jsx";
import Settings from "./components/Settings.jsx";
import Onboarding from "./components/Onboarding.jsx";
import Toast from "./components/Toast.jsx";
import { bookById } from "./lib/books.js";
import { hadithsInChapter, loadBook } from "./lib/hadith.js";
import { listBooks } from "./lib/db.js";
import { migrateLegacy } from "./lib/reflections.js";

const DEFAULT_SETTINGS = { theme: "system", showArabic: true, arabicSize: 22, englishSize: 19 };
const THEME_COLORS = { light: "#FAFAF8", dark: "#151412" };

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the app still works for this session */
  }
}

const TABS = [
  { id: "library", label: "Library", icon: "library" },
  { id: "reader", label: "Focus", icon: "focus" },
  { id: "journal", label: "Journal", icon: "journal" },
];

// History model, so Android's back button behaves like a native app's:
// Library is the root (depth 0). Other tabs sit one level above it and
// replace each other, so back from any tab returns to Library and back from
// Library leaves the app. Settings is a sub-page pushed on top of any tab.
const state = () => history.state || { view: "library", depth: 0 };

export default function App() {
  const [view, setView] = useState("library");
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...readJson("hadith_settings", {}) }));
  const [reading, setReading] = useState(null);
  const [lastRead, setLastRead] = useState(() => readJson("hadith_last", null));
  const [cached, setCached] = useState(() => new Set());
  const [reflectionsKey, setReflectionsKey] = useState(0);
  const [toast, setToast] = useState(null);
  const [onboarding, setOnboarding] = useState(() => localStorage.getItem("hadith_onboarded") !== "true");
  const pageRef = useRef(null);
  const scrolls = useRef({});

  const showToast = useCallback((msg, action) => setToast({ msg, action, id: Date.now() }), []);
  const hideToast = useCallback(() => setToast(null), []);
  const bumpReflections = useCallback(() => setReflectionsKey((k) => k + 1), []);
  const refreshCached = useCallback(() => listBooks().then((list) => setCached(new Set(list.map((b) => b.bookId)))).catch(() => {}), []);

  const navigate = useCallback((to) => {
    const cur = state();
    if (cur.view === to) return;
    scrolls.current[cur.view] = pageRef.current?.scrollTop || 0;
    if (to === "settings") history.pushState({ view: to, depth: cur.depth + 1 }, "");
    else if (to === "library") {
      if (cur.depth > 0) {
        history.go(-cur.depth);
        return; // popstate sets the view
      }
      history.replaceState({ view: to, depth: 0 }, "");
    } else if (cur.depth === 0) history.pushState({ view: to, depth: 1 }, "");
    else history.replaceState({ view: to, depth: cur.depth }, "");
    setView(to);
  }, []);

  useEffect(() => {
    const onPop = (e) => {
      scrolls.current[view] = pageRef.current?.scrollTop || 0;
      setView(e.state?.view || "library");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [view]);

  useLayoutEffect(() => {
    pageRef.current?.scrollTo({ top: scrolls.current[view] || 0 });
  }, [view]);

  // Theme: explicit choice, or follow the phone.
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const theme = settings.theme === "system" ? (media.matches ? "dark" : "light") : settings.theme;
      document.documentElement.dataset.theme = theme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings.theme]);

  const updateSettings = (next) => {
    setSettings(next);
    writeJson("hadith_settings", next);
  };

  const remember = useCallback((book, chapter, hadith) => {
    if (!hadith) return;
    const last = { bookId: book.id, bookName: book.name, chapterId: chapter.id, chapterTitle: chapter.title, hadithId: hadith.id };
    setLastRead(last);
    writeJson("hadith_last", last);
  }, []);

  useEffect(() => {
    if (!reading) return;
    const list = hadithsInChapter(reading.hadiths, reading.chapter);
    remember(reading.book, reading.chapter, list[reading.index]);
  }, [reading, remember]);

  const openChapter = useCallback(
    (book, data, chapter, index = 0) => {
      setReading({ book, chapters: data.chapters, hadiths: data.hadiths, chapter, index });
      navigate("reader");
    },
    [navigate]
  );

  const openAt = useCallback(
    async ({ bookId, chapterId, hadithId }) => {
      const book = bookById(bookId);
      if (!book) return;
      try {
        const data = await loadBook(book);
        const chapter = data.chapters.find((c) => c.id === chapterId) || data.chapters[0];
        const index = Math.max(0, hadithsInChapter(data.hadiths, chapter).findIndex((h) => h.id === hadithId));
        openChapter(book, data, chapter, index);
      } catch {
        showToast(navigator.onLine ? "Couldn't open that collection" : "Connect once to download this collection");
      }
    },
    [openChapter, showToast]
  );

  // First run: migrate v2 data, set the root history entry, honour shortcuts.
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    migrateLegacy().then((n) => n && bumpReflections());
    refreshCached();
    const params = new URLSearchParams(location.search);
    history.replaceState({ view: "library", depth: 0 }, "", "/");
    if (params.get("view") === "journal") navigate("journal");
    if (params.get("open") === "resume" && lastRead) openAt(lastRead);
  }, [bumpReflections, refreshCached, navigate, openAt, lastRead]);

  const onTab = (id) => {
    if (id !== "reader") return navigate(id);
    if (reading) return navigate("reader");
    if (lastRead) return openAt(lastRead);
    showToast("Choose a chapter from the library to start");
  };

  const activeTab = view === "settings" ? null : view;

  return (
    <div className="app-shell">
      {onboarding && (
        <Onboarding
          onDone={() => {
            localStorage.setItem("hadith_onboarded", "true");
            setOnboarding(false);
          }}
        />
      )}

      <main className="page-content" ref={pageRef}>
        <div hidden={view !== "library" && !(view === "reader" && !reading)}>
          <Library
            cached={cached}
            lastRead={lastRead}
            onResume={() => openAt(lastRead)}
            onOpenChapter={openChapter}
            onBookCached={refreshCached}
            onSettings={() => navigate("settings")}
          />
        </div>
        {view === "reader" && reading && (
          <Reader
            reading={reading}
            settings={settings}
            onBack={() => navigate("library")}
            onChangeChapter={(chapter, index) => setReading((r) => ({ ...r, chapter, index }))}
            onChangeIndex={(index) => setReading((r) => ({ ...r, index }))}
            showToast={showToast}
            onReflectionsChanged={bumpReflections}
          />
        )}
        {view === "journal" && (
          <Journal refreshKey={reflectionsKey} onOpen={openAt} onSettings={() => navigate("settings")} onLibrary={() => navigate("library")} showToast={showToast} />
        )}
        {view === "settings" && (
          <Settings
            settings={settings}
            onChange={updateSettings}
            onBack={() => history.back()}
            onBooksChanged={refreshCached}
            onReflectionsChanged={bumpReflections}
            showToast={showToast}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} className={`nav-item${activeTab === t.id ? " active" : ""}`} aria-current={activeTab === t.id ? "page" : undefined} onClick={() => onTab(t.id)}>
            <span className="nav-pill">
              <Icon name={t.icon} />
            </span>
            {t.label}
          </button>
        ))}
      </nav>

      {toast && <Toast key={toast.id} toast={toast} onDone={hideToast} />}
    </div>
  );
}
