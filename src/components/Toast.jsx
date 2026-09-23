import { useEffect } from "react";

export default function Toast({ toast, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, toast.action ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [toast, onDone]);

  return (
    <div className="toast-bar" role="status" aria-live="polite">
      <span>{toast.msg}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action.run();
            onDone();
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
