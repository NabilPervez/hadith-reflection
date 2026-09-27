import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import Sheet from "./Sheet.jsx";
import { gradeTone, hadithsInChapter } from "../lib/hadith.js";
import { listReflections, reflectionId, saveReflection } from "../lib/reflections.js";

const SAVE_DELAY = 700;

function Grades({ grades }) {
  const [open, setOpen] = useState(false);
  if (!grades.length) return null;
  const [first, ...rest] = grades;
  return (
    <div className="grades">
      <button
        className={`grade-chip tone-${gradeTone(first.grade)}`}
        onClick={() => rest.length && setOpen(!open)}
        aria-expanded={rest.length ? open : undefined}
        aria-label={`Graded ${first.grade} by ${first.name}${rest.length ? `, and ${rest.length} more` : ""}`}
      >
        <strong>{first.grade}</strong>
        <span className="grader">{first.name}</span>
        {rest.length > 0 && <span className="grader">+{rest.length}</span>}
      </button>
      {open && (
        <div className="grade-list">
          {rest.map((g) => (
            <div key={g.name}>
              <span className={`tone-${gradeTone(g.grade)}`}>{g.grade}</span> — {g.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Reader({ reading, settings, onBack, onChangeChapter, onChangeIndex, showToast, onReflectionsChanged }) {
  const { book, chapters, hadiths, chapter, index } = reading;
  const list = useMemo(() => hadithsInChapter(hadiths, chapter), [hadiths, chapter]);
  const hadith = list[Math.min(index, list.length - 1)];
  const chapterPos = chapters.findIndex((c) => c.id === chapter.id);

  const [notes, setNotes] = useState(() => new Map());
  const [text, setText] = useState("");
  const [saveState, setSaveState] = useState(null);
  const [sheet, setSheet] = useState(null);
  const topRef = useRef(null);

  // The pending draft lives in a ref so it can be flushed synchronously when
  // the reader moves on — a debounce alone drops the last keystrokes.
  const draft = useRef(null);
  const timer = useRef(null);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const d = draft.current;
    if (!d) return;
    draft.current = null;
    saveReflection(d).then((record) => {
      setNotes((prev) => {
        const next = new Map(prev);
        if (record) next.set(record.id, record);
        else next.delete(reflectionId(d.book.id, d.chapter.id, d.hadith.id));
        return next;
      });
      setSaveState(record ? "saved" : null);
      onReflectionsChanged();
    });
  }, [onReflectionsChanged]);

  useEffect(() => {
    listReflections().then((all) => setNotes(new Map(all.map((r) => [r.id, r]))));
  }, []);

  const noteId = hadith ? reflectionId(book.id, chapter.id, hadith.id) : null;

  useEffect(() => {
    setText(notes.get(noteId)?.text || "");
    setSaveState(null);
    topRef.current?.scrollIntoView({ block: "start" });
    return flush;
    // Only when the hadith changes, not every time a note is saved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, flush]);

  // Load notes once they arrive (first render has an empty map).
  useEffect(() => {
    if (!draft.current) setText(notes.get(noteId)?.text || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.size]);

  const onType = (value) => {
    setText(value);
    setSaveState("typing");
    draft.current = { book, chapter, hadith, text: value };
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  };

  const atStart = index === 0 && chapterPos === 0;
  const atEnd = index >= list.length - 1 && chapterPos === chapters.length - 1;

  const go = useCallback(
    (dir) => {
      if (dir > 0) {
        if (index < list.length - 1) onChangeIndex(index + 1);
        else if (chapterPos < chapters.length - 1) {
          onChangeChapter(chapters[chapterPos + 1], 0);
          showToast(`Chapter ${chapters[chapterPos + 1].id}: ${chapters[chapterPos + 1].title}`);
        } else showToast("You've reached the end of this collection");
      } else if (index > 0) onChangeIndex(index - 1);
      else if (chapterPos > 0) {
        const prev = chapters[chapterPos - 1];
        onChangeChapter(prev, Math.max(0, hadithsInChapter(hadiths, prev).length - 1));
      }
    },
    [index, list.length, chapterPos, chapters, hadiths, onChangeIndex, onChangeChapter, showToast]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (sheet || e.target.closest?.("textarea, input")) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, sheet]);

  const touch = useRef(null);
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  };
  const onTouchEnd = (e) => {
    const start = touch.current;
    touch.current = null;
    if (!start || window.getSelection()?.toString()) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 50 && Date.now() - start.time < 600) go(dx < 0 ? 1 : -1);
  };

  const share = async () => {
    flush();
    const parts = [hadith.englishText || hadith.arabicText, `— ${hadith.citation}`];
    if (text.trim()) parts.push(`My reflection: ${text.trim()}`);
    parts.push("Shared from Hadith Reflection · https://hadith-reflection.netlify.app/");
    const body = parts.join("\n\n");
    if (navigator.share) {
      try {
        await navigator.share({ title: hadith.citation, text: body });
      } catch {
        /* dismissed */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(body);
      showToast("Copied to clipboard");
    } catch {
      showToast("Sharing isn't available in this browser");
    }
  };

  if (!hadith) {
    return (
      <div>
        <div className="reader-header">
          <button className="icon-btn" onClick={onBack} aria-label="Back to library">
            <Icon name="back" />
          </button>
        </div>
        <div className="empty-state">
          <h2 className="empty-title">No narrations here</h2>
          <p className="empty-sub">This chapter has no narrations in the current edition.</p>
          <button className="btn btn-primary" onClick={onBack}>
            Back to library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={topRef}>
      <div className="reader-header">
        <button className="icon-btn" onClick={onBack} aria-label="Back to library">
          <Icon name="back" />
        </button>
        <button className="reader-title-btn" onClick={() => setSheet("chapters")} aria-label={`${chapter.title}. Change chapter`}>
          <span className="reader-book">{book.name}</span>
          <span className="reader-chapter">
            <span>{chapter.title}</span>
            <Icon name="down" size={14} style={{ color: "var(--gold)", flexShrink: 0 }} />
          </span>
        </button>
        <button className="counter-btn" onClick={() => setSheet("numbers")} aria-label={`Narration ${index + 1} of ${list.length}. Jump to another`}>
          {index + 1}/{list.length}
        </button>
      </div>
      <div className="reader-progress" aria-hidden="true">
        <div style={{ width: `${((index + 1) / list.length) * 100}%` }} />
      </div>

      <article className="card hadith-card" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} aria-label={hadith.citation}>
        <div className="hadith-number-badge">No. {hadith.id}</div>
        <Grades grades={hadith.grades || []} />
        {settings.showArabic && hadith.arabicText && (
          <p className="hadith-arabic" lang="ar" style={{ fontSize: settings.arabicSize }}>
            {hadith.arabicText}
          </p>
        )}
        {hadith.englishText ? (
          <p className="hadith-translation" style={{ fontSize: settings.englishSize }}>
            {hadith.englishText}
          </p>
        ) : (
          <p className="missing-translation">
            {settings.showArabic ? "No English translation is available for this narration." : "This narration has only Arabic text. Turn on Arabic in Settings to read it."}
          </p>
        )}
        <div className="hadith-citation">
          <div className="citation-dot" />
          <span>
            {hadith.citation}
            {hadith.ref && ` · Book ${hadith.ref.book}, Hadith ${hadith.ref.hadith}`}
          </span>
        </div>
      </article>

      <div className="card reflection-panel">
        <label className="reflection-label" htmlFor="reflection">
          <Icon name="pen" size={14} />
          My reflection
          <span className={`save-state${saveState === "saved" ? " saved" : ""}`} aria-live="polite">
            {saveState === "saved" ? "Saved" : saveState === "typing" ? "Saving…" : notes.get(noteId) ? new Date(notes.get(noteId).date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
          </span>
        </label>
        <textarea
          id="reflection"
          className="reflection-textarea"
          placeholder="What does this hadith mean for your life today? Write freely…"
          value={text}
          onChange={(e) => onType(e.target.value)}
          onBlur={flush}
          rows={4}
        />
      </div>

      <div className="reader-actions">
        <button className="btn btn-ghost" onClick={() => go(-1)} disabled={atStart} aria-label="Previous narration">
          <Icon name="back" size={20} />
        </button>
        <button className="btn btn-soft" onClick={share}>
          <Icon name="share" size={18} /> Share
        </button>
        <button className="btn btn-primary" onClick={() => go(1)} disabled={atEnd}>
          {index < list.length - 1 ? "Next" : "Next chapter"} <Icon name="forward" size={18} />
        </button>
      </div>

      {sheet === "chapters" && (
        <Sheet eyebrow="Jump to chapter" title={book.name} onClose={() => setSheet(null)}>
          {chapters.map((c) => (
            <button
              key={c.id}
              className={`chapter-item${c.id === chapter.id ? " current" : ""}`}
              aria-current={c.id === chapter.id ? "true" : undefined}
              onClick={() => {
                setSheet(null);
                if (c.id !== chapter.id) onChangeChapter(c, 0);
              }}
            >
              <span className="chapter-num">{c.id}</span>
              <span className="chapter-info">
                <span className="chapter-name" style={{ display: "block" }}>
                  {c.title}
                </span>
                <span className="chapter-sub" style={{ display: "block" }}>
                  {c.hadithLast - c.hadithFirst + 1} narrations
                </span>
              </span>
            </button>
          ))}
        </Sheet>
      )}

      {sheet === "numbers" && (
        <Sheet eyebrow={chapter.title} title="Jump to narration" onClose={() => setSheet(null)}>
          <div className="number-grid">
            {list.map((h, i) => {
              const hasNote = notes.has(reflectionId(book.id, chapter.id, h.id));
              return (
                <button
                  key={h.id}
                  className={`${i === index ? "current" : ""}${hasNote ? " has-note" : ""}`}
                  aria-current={i === index ? "true" : undefined}
                  aria-label={`Hadith ${h.id}${hasNote ? ", has a reflection" : ""}`}
                  onClick={() => {
                    setSheet(null);
                    onChangeIndex(i);
                  }}
                >
                  {h.id}
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
    </div>
  );
}
