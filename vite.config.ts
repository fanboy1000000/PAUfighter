import { defineConfig } from "vitest/config";

// The repository is served from a GitHub Pages sub-path
// (https://<user>.github.io/PAUfighter/), so asset URLs must be relative to it.
// This one line is the whole of the Pages configuration (ADR-001 D5).
const base = process.env.PAUFIGHTER_BASE ?? "/PAUfighter/";

export default defineConfig({
  base,
  build: {
    outDir: "dist",
    // Everything is bundled locally — no CDNs, no foreign fonts, no third-party
    // scripts. See the conventions in docs/CONVENTIONS.md section 4.
    assetsInlineLimit: 4096,
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
