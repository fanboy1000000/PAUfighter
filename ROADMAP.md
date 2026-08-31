# PAUfighter — Roadmap

> **Governance:** Orchestrator-only. This is the living **forward view**. It is not the product
> spec, not the decision record (→ `docs/knowledge-base/`), not the shipped ledger
> (→ `docs/sprints/INDEX.md`), and not next-sprint planning (→ the sprint log itself).

## The forcing mechanism — why this file stays alive

Roadmaps rot because nothing obliges anyone to update them.

**At every sprint close, step (7) of the workflow routes every follow-up that is not scheduled
for the next sprint into the Backlog below.** That is not a suggestion in a document; it is a
numbered step in `docs/WORKFLOW.md`, and the sprint is not closed until it is done. An item
leaves the Backlog only by being promoted into a sprint.

The rule this enforces: **nothing is lost by being merely mentioned.** A follow-up raised in a
review and not written down here does not exist.

---

## Where the game is heading

A loose direction, not a commitment. Sprint numbers are projections; the sprint log is the
authority on what is actually next.

### Now — a fight that can be trusted

Get a seeded, deterministic fight running end to end, with the invariants provable rather than
asserted. Ugly is fine. Wrong is not.

- Seeded random number generation, injected into the core.
- Fighters with stats, and a fight that resolves round by round.
- A structured event log that explains the outcome (I5).
- Invariant tests: determinism, monotonicity, corner symmetry.

### Next — something a colleague can open

Make it shareable, because a simulator nobody watches is a test suite with ambitions.

- A minimal UI: build two fighters, run the fight, watch the log.
- Deploy to GitHub Pages from CI.
- Share the seed, so two people can watch the same fight.

### Later — something worth watching twice

Only once the above is solid, and strictly in trade-off order: depth before polish, polish
before breadth.

- More simulation depth: fighting styles, stamina, damage that accumulates, knockouts, judges.
- Presentation: round-by-round playback rather than a wall of text.
- Breadth: saved fighters, tournaments, a leaderboard.

---

## Backlog — deferred, registered, not forgotten

Items routed here at sprint close. Each one names the sprint that deferred it, so nothing
arrives anonymously.

| Item | Why deferred | Deferred at |
|---|---|---|
| **Enforce the core/UI import boundary** (`F-005`) — resolve every import specifier in `src/core/` against the importing file and reject anything landing outside the core, with a control proving it on the relative spelling `../ui/render`. | Owner ruling S1-R2 scoped Sprint 1's last fix round to the guard hole and its documentation. ADR-001 now carries a dated amendment saying this half of its constraint is convention-enforced, so nothing is silently overstated in the meantime. | Sprint 1 close |
| **AST-aware environment enforcement** (`F-003`) — replace the text scan with a rule that parses the code, closing obfuscated and aliased access in one move. | Needs an ESLint toolchain. Real cost against shipping speed for a core of one file. Revisit at roughly five core files. | Sprint 1 close |
| **A real mechanical guarantee that reviewers cannot write files** — a permission deny-rule on write-capable shell commands for the reviewer agent. | Spawning reviewers as `Explore` removes `Edit`/`Write`/`NotebookEdit`, which stops the *accidental* edit — the realistic failure. Shell access remains, so the deliberate route is closed by instruction only. `AGENTS.md` now says so rather than claiming the guarantee. | Sprint 1 close |
| **Normalise path sorting in the core-file scan** (`F-004`) — compare repo-relative forward-slash paths at both sites. | Harmless while `src/core/` is flat. Becomes a false test failure the moment it gains a subdirectory. | Sprint 1 close |
| **Confirm the golden sequence in a browser** — paste the pinned first-ten values of `createRng(42)` into a browser console once and record the match in a sprint log. | Sprint 1's acceptance criterion 15, unmet. `vite.config.ts` sets `environment: "node"`, so the suite can only ever prove stability *within* Node; the cross-engine half of I1 rests on `Math.imul` and `>>>` being specified operations plus this one manual check. Two minutes, and it needs a human with a browser. | Sprint 1 close |
| **Give `tools/check-docs.mjs` a real Markdown link parser, or narrow its claim** — `checkLocalLinks` recognises only simple inline links whose destination has no whitespace or `)`. Reference-style links, angle-bracket destinations and titled destinations are not seen. | Every link in the repository today is the simple form, so the check is doing its job. The claim in the script header was narrowed rather than the parser widened, because a Markdown parser is a dependency and the core has none. | Sprint 1 close |

---

## Parking lot — loose ideas

Unfiltered. No commitment, no order, no obligation. Ideas are cheap and worth keeping; the cost
of a bad idea in this list is zero, and the cost of a good idea forgotten is not.

- Commentary track that narrates the log as it plays.
- Fighter archetypes as presets (brawler, counter-puncher, grappler).
- A "rematch with the same seed" button, to show the fight really is deterministic.
- Export a fight as a shareable link containing the seed and both fighters.
