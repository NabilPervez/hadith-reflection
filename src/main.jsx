import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// No StrictMode: its double-run of effects would push duplicate history
// entries for sheets, which breaks the Android back-button behaviour.
createRoot(document.getElementById("root")).render(<App />);
