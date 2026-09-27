import { useEffect, useRef } from "react";

// Lets Android's back button (and the browser's) close an open sheet instead
// of leaving the screen. Opening pushes a history entry; back pops it and
// closes the sheet; closing from the UI removes the entry again.
export function useBackClose(open, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    history.pushState({ ...history.state, sheet: true }, "");
    let popped = false;
    const onPop = () => {
      popped = true;
      closeRef.current();
    };
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      if (!popped && history.state?.sheet) history.back();
    };
  }, [open]);
}
