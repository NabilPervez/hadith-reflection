import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { bookById } from "../lib/books.js";
import { clearBooks, deleteBook, listBooks } from "../lib/db.js";
import { clearReflections, importReflections, listReflections } from "../lib/reflections.js";
import { exportJournal } from "../lib/backup.js";

export const APP_VERSION = "3.0";

function Switch({ checked, onChange, label }) {
  return <button className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />;
}

function Slider({ label, value, min, max, onChange }) {
  return (
    <div className="settings-row">
      <label className="settings-label" htmlFor={label}>
        {label}
      </label>
      <div className="slider-row">
        <span className="slider-value">{value}</span>
        <input id={label} type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)} />
      </div>
    </div>
  );
}

const ageLabel = (ts) => {
  const days = Math.floor((Date.now() - ts) / 864e5);
  return days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
};

export default function Settings({ settings, onChange, onBack, onBooksChanged, onReflectionsChanged, showToast }) {
  const [books, setBooks] = useState(null);
  const fileRef = useRef(null);

  const refresh = useCallback(async () => setBooks(await listBooks().catch(() => [])), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const set = (patch) => onChange({ ...settings, ...patch });

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { added, skipped } = await importReflections(await file.text());
      onReflectionsChanged();
      showToast(added ? `Imported ${added} reflection${added === 1 ? "" : "s"}${skipped ? ` · ${skipped} skipped` : ""}` : "Nothing new to import");
    } catch {
      showToast("That file isn't a Hadith Reflection backup");
    }
  };

  const totalHadiths = books?.reduce((n, b) => n + b.hadithCount, 0) || 0;

  return (
    <div>
      <header className="page-header" style={{ paddingTop: 16 }}>
        <button className="icon-btn" onClick={onBack} aria-label="Back" style={{ marginLeft: -10 }}>
          <Icon name="back" />
        </button>
        <p className="eyebrow" style={{ marginTop: 8 }}>
          Preferences
        </p>
        <h1 className="page-title">Settings</h1>
      </header>

      <section className="settings-section">
        <h2 className="section-label">Appearance</h2>
        <div className="card">
          <div className="settings-row">
            <span className="settings-label">Theme</span>
            <div className="segmented" role="group" aria-label="Theme">
              {["system", "light", "dark"].map((t) => (
                <button key={t} aria-pressed={settings.theme === t} onClick={() => set({ theme: t })}>
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-label">Reading</h2>
        <div className="card">
          <div className="type-preview" aria-hidden="true">
            {settings.showArabic && (
              <p className="hadith-arabic" lang="ar" style={{ fontSize: settings.arabicSize }}>
                إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ
              </p>
            )}
            <p className="hadith-translation" style={{ fontSize: settings.englishSize }}>
              Actions are judged by intentions.
            </p>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Arabic text</div>
              <div className="settings-sublabel">Show the original Arabic above the translation</div>
            </div>
            <Switch checked={settings.showArabic} onChange={(v) => set({ showArabic: v })} label="Show Arabic text" />
          </div>
          {settings.showArabic && <Slider label="Arabic size" value={settings.arabicSize} min={16} max={36} onChange={(v) => set({ arabicSize: v })} />}
          <Slider label="English size" value={settings.englishSize} min={14} max={28} onChange={(v) => set({ englishSize: v })} />
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-label">
          Offline collections{totalHadiths > 0 && ` · ${totalHadiths.toLocaleString()} hadiths`}
        </h2>
        <div className="card">
          {books === null && (
            <div className="spinner-wrap" style={{ padding: 20 }}>
              <div className="spinner" />
            </div>
          )}
          {books?.length === 0 && (
            <div className="settings-row">
              <div>
                <div className="settings-label">Nothing downloaded yet</div>
                <div className="settings-sublabel">Open a collection in the library to keep it offline</div>
              </div>
            </div>
          )}
          {books?.map((b) => {
            const name = bookById(b.bookId)?.name || b.bookId;
            return (
              <div className="cache-item" key={b.bookId}>
                <div>
                  <div className="cache-name">{name}</div>
                  <div className="cache-meta">
                    {b.hadithCount.toLocaleString()} hadiths · saved {ageLabel(b.fetchedAt)}
                  </div>
                </div>
                <button
                  className="cache-clear-btn"
                  aria-label={`Remove ${name} from this device`}
                  onClick={async () => {
                    await deleteBook(b.bookId);
                    await refresh();
                    onBooksChanged();
                    showToast(`${name} removed from this device`);
                  }}
                >
                  Remove
                </button>
              </div>
            );
          })}
          {books?.length > 1 && (
            <button
              className="settings-row settings-btn"
              onClick={async () => {
                if (!confirm("Remove every downloaded collection? Your reflections are kept.")) return;
                await clearBooks();
                await refresh();
                onBooksChanged();
                showToast("All collections removed");
              }}
            >
              <span className="settings-body danger-text">
                <Icon name="trash" size={20} style={{ color: "var(--danger)" }} /> Remove all downloads
              </span>
            </button>
          )}
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-label">Journal backup</h2>
        <div className="card">
          <button className="settings-row settings-btn" onClick={async () => showToast(await exportJournal(await listReflections()))}>
            <span className="settings-body">
              <Icon name="offline" size={20} />
              <span>
                <span className="settings-label" style={{ display: "block" }}>
                  Export journal
                </span>
                <span className="settings-sublabel" style={{ display: "block" }}>
                  Save every reflection as a .json file
                </span>
              </span>
            </span>
          </button>
          <button className="settings-row settings-btn" onClick={() => fileRef.current?.click()}>
            <span className="settings-body">
              <Icon name="upload" size={20} />
              <span>
                <span className="settings-label" style={{ display: "block" }}>
                  Import journal
                </span>
                <span className="settings-sublabel" style={{ display: "block" }}>
                  Restore from a backup; existing entries are kept
                </span>
              </span>
            </span>
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
          <button
            className="settings-row settings-btn"
            onClick={async () => {
              if (!confirm("Delete every reflection? This can't be undone. Export a backup first if you want to keep them.")) return;
              await clearReflections();
              onReflectionsChanged();
              showToast("All reflections deleted");
            }}
          >
            <span className="settings-body danger-text">
              <Icon name="trash" size={20} style={{ color: "var(--danger)" }} /> Delete all reflections
            </span>
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-label">About</h2>
        <div className="card">
          <a className="settings-row settings-btn" href="/privacy/">
            <span className="settings-body">
              <Icon name="shield" size={20} />
              <span className="settings-label">Privacy policy</span>
            </span>
            <Icon name="forward" size={16} />
          </a>
          <div className="settings-row">
            <span className="settings-body" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <Icon name="info" size={20} style={{ color: "var(--text-2)", flexShrink: 0, marginTop: 2 }} />
              <span className="settings-sublabel" style={{ marginTop: 0, lineHeight: 1.6 }}>
                Hadith text, translations and grades come from the open-source hadith-api by Fawaz Ahmed. Grades are shown as each scholar gave them.
              </span>
            </span>
          </div>
        </div>
      </section>

      <p className="settings-footer">
        Everything is stored privately on this device.
        <br />
        No account · No tracking · No ads
        <br />
        Hadith Reflection {APP_VERSION}
      </p>
    </div>
  );
}
