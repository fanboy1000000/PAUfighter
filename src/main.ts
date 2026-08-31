// Entry point. The UI layer only — no game logic lives here or anywhere under
// src/ui/. Anything that decides an outcome belongs in src/core/ (ADR-001 D3),
// because logic in the UI cannot be run ten thousand times in a test, and so
// cannot be proven monotonic (I2) or symmetric (I3).

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("PAUfighter: #app mount point is missing from index.html");
}

app.textContent = "PAUfighter — no fights yet.";
