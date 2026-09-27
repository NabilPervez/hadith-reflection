import { useEffect, useMemo, useState } from "react";
import Icon from "./Icon.jsx";
import { listReflections, deleteReflection, putReflection } from "../lib/reflections.js";
import { exportJournal } from "../lib/backup.js";
import { shareText } from "../lib/share.js";

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
};

export default function Journal({ refreshKey, onOpen, onSettings, onLibrary, showToast }) {
  const [entries, setEntries] = useState(null);
  const [query, setQuery] = useState("");

  const reload = () => listReflections().then(setEntries);
  useEffect(() => {
    reload();
  }, [refreshKey]);

  const visible = useMemo(() => {
    if (!entries) return [];
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => [e.text, e.hadithExcerpt, e.bookName, e.chapterTitle].some((f) => f?.toLowerCase().includes(q)));
  }, [entries, query]);

  const remove = async (entry) => {
    await deleteReflection(entry.id);
    reload();
    showToast("Reflection deleted", {
      label: "Undo",
      run: async () => {
        await putReflection(entry);
        reload();
      },
    });
  };

  return (
    <div>
      <header className="page-header">
        <div className="page-header-row">
          <p className="eyebrow">My Journal</p>
          <button className="icon-btn" onClick={onSettings} aria-label="Settings">
            <Icon name="settings" />
          </button>
        </div>
        <h1 className="page-title">Reflections</h1>
        {entries?.length > 0 && (
          <p className="page-subtitle">
            {entries.length} {entries.length === 1 ? "entry" : "entries"} · saved on this device ·{" "}
            <button className="link-btn" style={{ padding: 0, fontSize: 13 }} onClick={() => exportJournal(entries).then(showToast)}>
              Export
            </button>
          </p>
        )}
      </header>

      {entries === null && (
        <div className="spinner-wrap">
          <div className="spinner" />
        </div>
      )}

      {entries?.length === 0 && (
        <div className="empty-state">
          <Icon name="journal" size={40} strokeWidth={1.4} />
          <h2 className="empty-title">No reflections yet</h2>
          <p className="empty-sub">Open a hadith from the library and write what it means to you. Your notes appear here.</p>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={onLibrary}>
            Go to library
          </button>
        </div>
      )}

      {entries?.length > 3 && (
        <label className="search">
          <Icon name="search" size={18} />
          <span className="sr-only">Search reflections</span>
          <input type="search" placeholder="Search your reflections" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      )}

      {entries?.length > 0 && visible.length === 0 && <p className="empty-sub" style={{ margin: "24px auto", textAlign: "center" }}>Nothing matches “{query}”.</p>}

      {visible.map((entry, i) => (
        <article key={entry.id} className="card journal-card" style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}>
          <div className="journal-card-header">
            <span className="journal-source">
              {entry.bookName} · Hadith {entry.hadithId}
            </span>
            <span className="journal-date">{formatDate(entry.date)}</span>
          </div>
          <p className="journal-reflection">{entry.text}</p>
          <p className="journal-excerpt">{entry.hadithExcerpt}</p>
          <div className="journal-actions">
            <button className="danger-text" onClick={() => remove(entry)}>
              Delete
            </button>
            <button
              className="link-btn"
              onClick={() =>
                shareText({
                  title: `${entry.bookName} · Hadith ${entry.hadithId}`,
                  parts: [entry.hadithExcerpt, `— ${entry.bookName}, Hadith ${entry.hadithId}`, `My reflection: ${entry.text.trim()}`],
                  showToast,
                })
              }
            >
              <Icon name="share" size={14} /> Share
            </button>
            <button className="link-btn" onClick={() => onOpen(entry)}>
              Open hadith →
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
