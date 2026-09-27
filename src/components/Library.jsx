import { useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { BOOKS, formatSize } from "../lib/books.js";
import { loadBook } from "../lib/hadith.js";

export default function Library({ cached, lastRead, onResume, onOpenChapter, onBookCached, onSettings }) {
  const [openId, setOpenId] = useState(null);
  const [data, setData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  // Only the most recently opened book may write to state; an earlier
  // download that finishes late must not fill the wrong drawer.
  const latest = useRef(0);

  const load = async (book) => {
    const token = ++latest.current;
    const current = () => token === latest.current;
    setData(null);
    setError(null);
    setProgress(cached.has(book.id) ? null : 0);
    try {
      const result = await loadBook(book, { onProgress: (p) => current() && setProgress(p) });
      if (!result.fromCache) onBookCached(book.id);
      if (current()) setData(result);
    } catch {
      if (current()) {
        setError(navigator.onLine ? "The download didn't finish. Try again." : "You're offline. Connect once to download this collection.");
      }
    } finally {
      if (current()) setProgress(null);
    }
  };

  const toggle = (book) => {
    if (openId === book.id) {
      setOpenId(null);
      return;
    }
    setOpenId(book.id);
    load(book);
  };

  return (
    <div>
      <header className="page-header">
        <div className="page-header-row">
          <p className="eyebrow">Hadith Library</p>
          <button className="icon-btn" onClick={onSettings} aria-label="Settings">
            <Icon name="settings" />
          </button>
        </div>
        <h1 className="page-title">Select a collection</h1>
        <p className="page-subtitle">{BOOKS.length} collections · Arabic and English · Reads offline</p>
      </header>

      {lastRead && (
        <button className="card continue-card" onClick={onResume}>
          <div className="continue-meta">
            <p className="continue-label">Continue reading</p>
            <p className="continue-title">{lastRead.chapterTitle}</p>
            <p className="continue-sub">
              {lastRead.bookName} · Hadith {lastRead.hadithId}
            </p>
          </div>
          <Icon name="forward" />
        </button>
      )}

      {BOOKS.map((book) => {
        const open = openId === book.id;
        const isCached = cached.has(book.id);
        return (
          <div key={book.id}>
            <button className="card book-card" aria-expanded={open} onClick={() => toggle(book)}>
              <div className="book-body">
                <p className="book-tag">{book.tag}</p>
                <h2 className="book-name">{book.name}</h2>
                <p className="book-meta">
                  <span>{book.author}</span>
                  <span aria-hidden="true">·</span>
                  {isCached ? (
                    <span className="offline-badge">
                      <Icon name="check" size={13} strokeWidth={2.4} /> Offline
                    </span>
                  ) : (
                    <span>{formatSize(book.mb)} download</span>
                  )}
                </p>
              </div>
              <Icon name="forward" className={`chevron${open ? " open" : ""}`} />
            </button>

            {open && (
              <div className="card chapters-drawer">
                {progress !== null && (
                  <div className="fetch-progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Downloading ${book.name}`}>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${Math.max(3, progress * 100)}%` }} />
                    </div>
                    <p className="progress-label">
                      Downloading for offline reading… {Math.round(progress * 100)}%
                    </p>
                  </div>
                )}
                {progress === null && !data && !error && (
                  <div className="spinner-wrap">
                    <div className="spinner" />
                  </div>
                )}
                {error && (
                  <div className="error-state">
                    <p>{error}</p>
                    <button className="btn btn-ghost" onClick={() => load(book)}>
                      Try again
                    </button>
                  </div>
                )}
                {data && (
                  <>
                    <div className="drawer-header">
                      <span>
                        {data.chapters.length} {data.chapters.length === 1 ? "chapter" : "chapters"} · {data.hadiths.length.toLocaleString()} narrations
                      </span>
                    </div>
                    {data.chapters.map((chapter) => (
                      <button key={chapter.id} className="chapter-item" onClick={() => onOpenChapter(book, data, chapter)}>
                        <span className="chapter-num">{chapter.id}</span>
                        <span className="chapter-info">
                          <span className="chapter-name" style={{ display: "block" }}>
                            {chapter.title}
                          </span>
                          <span className="chapter-sub" style={{ display: "block" }}>
                            {chapter.hadithLast - chapter.hadithFirst + 1} narrations
                          </span>
                        </span>
                        <Icon name="forward" size={16} style={{ color: "var(--text-3)" }} />
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
