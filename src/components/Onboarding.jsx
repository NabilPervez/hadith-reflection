import { useState } from "react";
import Icon from "./Icon.jsx";

const STEPS = [
  {
    icon: "focus",
    title: "One narration at a time",
    body: "Read every hadith in a chapter, in Arabic and English, without ads or clutter. Swipe left or right to move between them.",
  },
  {
    icon: "offline",
    title: "Reads offline",
    body: "The first time you open a collection it downloads to your phone. After that it opens instantly, with or without a connection.",
  },
  {
    icon: "lock",
    title: "Your reflections stay yours",
    body: "Notes are saved only on this device. No account, no tracking, nothing uploaded. Export a backup any time from Settings.",
  },
];

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="overlay">
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Welcome">
        <div className="onboard">
          <div className="onboard-icon">
            <Icon name={s.icon} size={34} strokeWidth={1.5} />
          </div>
          <h2 className="onboard-title">{s.title}</h2>
          <p className="onboard-body">{s.body}</p>
          <div className="onboard-dots" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((_, i) => (
              <div key={i} className={`onboard-dot${i === step ? " active" : ""}`} />
            ))}
          </div>
          <button className="btn btn-primary btn-block" onClick={last ? onDone : () => setStep(step + 1)} autoFocus>
            {last ? "Start reading" : "Continue"}
          </button>
          {!last && (
            <button className="link-btn" style={{ marginTop: 8, color: "var(--text-2)" }} onClick={onDone}>
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
