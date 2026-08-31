# [ADR-001] Build on TypeScript + Vite + Vitest, with a DOM-free simulation core

| Field | Value |
|---|---|
| **ID** | ADR-001 |
| **Status** | accepted |
| **Sprint** | Sprint 1 |
| **Date** | 2026-08-31 |
| **Ruled by** | owner |
| **Invariants** | I1, I2, I3, I4, I5 — all of them, indirectly |

## Context

PAUfighter began as an empty directory with no technology chosen. The owner named the choice
itself as the project's first step.

Three things narrowed the field before any technology was compared:

1. **It must run in a browser**, reachable by a colleague from one link. The owner asked for it
   hosted somewhere easy online.
2. **The five invariants must be mechanically verifiable.** I2 (raising a stat never lowers the
   win rate) and I3 (swapping corners mirrors the distribution) are statements about a
   *distribution*, not about one fight. Proving either means simulating thousands of fights in a
   test — which is only possible if the simulation can run without a browser.
3. **Shipping speed and easy sharing are the two highest-ranked trade-offs.** Anything that adds
   seconds to the first page load or days to the first playable build is expensive here, because
   nobody is obliged to use this. A gimmick that loads slowly is a gimmick nobody opens twice.

Three candidates were compared: TypeScript with Vite and Vitest; .NET Blazor WebAssembly with
xUnit; and a single hand-written HTML file with no build step.

## Decisions

- **D1** — The stack is **TypeScript**, built with **Vite**, tested with **Vitest**.
- **D2** — The simulation lives in `src/core/` as **pure TypeScript that never touches the DOM,
  the network, the clock, or any global state.** It is a library the UI calls, not a thing the
  UI is built into.
- **D3** — The UI lives in `src/ui/` and consumes `src/core/` through its exported functions
  only. **No game logic in the UI layer**, ever.
- **D4** — `src/core/` carries **zero runtime npm dependencies**. Build-time tooling is
  unrestricted; what ships in the bundle is ours.
- **D5** — The build output is **static files**, deployed to GitHub Pages. No server, no runtime
  backend.

## Alternatives considered

- **.NET Blazor WebAssembly + xUnit.** The owner's other project, StatsTid, is .NET, so this
  would have meant no new tooling to learn, a stronger type system (C# types exist at runtime;
  TypeScript's are erased at build time), and seeded deterministic randomness for free from the
  standard library. It lost on the first load: the browser must download a .NET runtime of
  roughly 1.5–3 MB before anything starts. For an office gimmick with no obligation attached,
  the gap between "opens instantly" and "shows a loading bar for three seconds" is the gap
  between being used and not. It also carries known friction on GitHub Pages (`base href`,
  `.nojekyll`, `404.html` routing) and reaches browser animation and sound through a
  translation layer, which taxes every later step toward polish.

- **A single HTML file with no build step.** The simplest option by a distance, and the only one
  that can be shared as a file on a network drive as well as a link. It starts instantly, has no
  dependencies, and will still open in two years. It lost on **I4 (no silent failures)**:
  without types, a misspelled field silently yields `undefined`, `undefined` in arithmetic
  silently yields `NaN`, and `NaN` propagates to a winner without ever raising an error. That is
  precisely the failure mode I4 exists to prevent, and this option demotes I4 from
  tool-enforced to remembered. It also makes the core/UI separation a matter of discipline
  rather than structure, which weakens the tests that prove I2 and I3.

## Consequences

**What this buys us.** All five invariants stay mechanically checkable. A DOM-free core runs
tens of thousands of fights in a test in under a second, which is the only way distribution
claims like I2 and I3 can be proven rather than asserted. TypeScript catches the `NaN` family of
defects at author time. First playable build is measured in minutes. The bundle is small enough
that load time is not a consideration.

**What we gave up, and why.** Three things. **A build step** — the game can no longer be run by
double-clicking a file; `npm run dev` during development and a CI build for deployment.
Accepted because the deployment target is a link, not a file, so the build step costs the owner
nothing at the point of sharing. **The npm dependency tree** — a few hundred build-time packages
and the security-advisory noise they generate. Contained by D4: none of them ship. **The owner's
familiarity** — C# is more familiar than TypeScript here, and that genuinely works against the
top-ranked trade-off of shipping speed. Accepted on the owner's own ruling, on the grounds that
the learning curve is mostly in the tooling rather than the language, and is paid once.

**What this constrains going forward.** `src/core/` may not import from `src/ui/` and may not
call `Math.random()`, `Date.now()`, `performance.now()`, `crypto.getRandomValues()`, `fetch`, or
`localStorage`. Randomness enters the core only as an injected seeded generator (see the Core
Engine Agent's scope in `docs/AGENTS.md`). Any feature that seems to require game logic in the
UI is a design error to be resolved in the core instead.

## Amendment — 2026-08-31 (Sprint 1, high-risk review)

> Appended, not rewritten. The decisions above stand unchanged; this records that the mechanical
> guard enforcing them is now broader than the list they name, and why two of the additions are
> more than housekeeping.

`tests/no-environment-access.test.ts` enforces the constraint above by scanning `src/core/**` and
by trapping the environment at runtime. Building that guard surfaced access routes this ADR did
not name. The guard now additionally rejects `globalThis`, `navigator.`, `location.`,
`indexedDB`, `WebSocket`, `process.`, `sessionStorage`, `Intl.`, `toLocaleString(`, `require(`,
`new Date`, and **`import.meta`** — and enforces that **every import in `src/core/` is a relative
path**, which is D4's actual mechanical check and did not previously exist.

Two of these are not housekeeping:

- **`import.meta`.** Vite rewrites `import.meta.env.DEV` at build time, so a core module branching
  on it would compute **a different fight in development than in the deployed build, from the same
  seed**. That is I1 failing in its purest form, and it is structurally invisible to a runtime
  trap — `import.meta` is syntax, not a property on an object that can be stubbed. The text scan
  is its only possible guard. If that pattern is ever removed from the list, nothing else in the
  repository notices.
- **Locale reads (`Intl.`, `toLocaleString(`).** The same core code behaves differently on two
  colleagues' machines depending on their locale and timezone — the same I1 failure by a quieter
  route, and plausible in code formatting an I5 fight log.

The intent of the original wording is unchanged: the core reads nothing from the outside world.
This amendment records that the list of "outside world" doors was incomplete.

## Amendment — 2026-08-31 (Sprint 1, closing review)

> Two claims in the sections above are stronger than what exists. Appended rather than rewritten.

**1. "TypeScript catches the `NaN` family of defects at author time" overstates it.** TypeScript's
`number` type *includes* `NaN`, and arithmetic on a value that arrived from an untyped caller can
still produce one. What actually holds **I4** is `requireIntegerInRange` in `src/core/rng.ts` —
runtime validation that throws, naming the offending value — together with the nine-case untyped
boundary table in `src/core/rng.test.ts`. TypeScript's real contribution is narrower and still
worth having: it catches the *shape* errors upstream of `NaN`, the misspelled field and the
wrong-typed argument, before they become arithmetic. The decision is unaffected; the reason given
for it was too generous.

**2. "`src/core/` may not import from `src/ui/`" is convention-enforced, not tool-enforced.**
`findNonRelativeImports` in `tests/no-environment-access.test.ts` passes any specifier beginning
`./` or `../`, so `import { renderRound } from "../ui/render";` in a future `src/core/fight.ts`
would be invisible to the scan, invisible to the import check, and would load cleanly under the
runtime trap. The one UI-import case the guard does catch is a root-absolute spelling that
`moduleResolution: "bundler"` would not resolve anyway — so it catches the form that cannot occur
and misses the form that can. Registered as **`F-005`** with the fix that closes it (resolve each
specifier against the importing file and flag anything landing outside `src/core/`). Until that
lands, the rule holds by discipline, and this amendment is what stops the guard's green tick
being read as proof.

## Revisit when

The UI outgrows hand-written DOM manipulation and a framework becomes worth its weight — that is
a UI-layer decision only, and D2 through D4 survive it untouched. D1 itself should be revisited
only if the game stops being a browser game.
