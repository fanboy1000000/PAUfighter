# PAUfighter Sprint Ledger

> **Governance:** Orchestrator-only. This is the accounting table — what shipped, when, with
> what proof. Sprint logs record *why* and *what was validated*; git history records *what
> changed*. The two are not substitutes.
>
> **Every sprint log on disk must appear here**, and every sprint named here must exist on disk.
> `tools/check-docs.mjs` fails the build on either mismatch.

## Sprints

| Sprint | Summary | Status | Dates | Test evidence | CI verdict |
|---|---|---|---|---|---|
| [Sprint 2](SPRINT-2.md) | A roadmap several people can work from. Backlog with stable ids, a claim mechanism and a written definition of done per item; `ADR-003` settles what binds a human contributor. No code changed. The closing review found a deadlock in which two individually correct fixes made claiming an item impossible. | in progress | 2026-08-31 → | **85 passing (±0 vs Sprint 1 — no code changed)** | `pending` — not yet pushed |
| [Sprint 1](SPRINT-1.md) | Governance harness + the seeded dice roller. Invariant model, workflow loop, agent definitions, knowledge base, registers, doc gate and CI — proven end to end on `src/core/rng.ts`. Gates found 4 BLOCKERs before any code, 3 in the code, and a structural flaw in the workflow that would have made every sprint unclosable. | complete (with carry-forward) | 2026-08-31 | **85 passing (+85 — first sprint, no prior baseline)** | **green** — run 3 `d695af2`, watched; site confirmed serving |

## How to read this table

- **Test evidence** is a count **with a delta** against the previous sprint. A bare count hides
  a regression: 40 passing looks fine until you know the previous sprint had 45.
- **CI verdict** is the verdict of a run that was actually watched to completion — never an
  assumption, and never a local result standing in for a remote one. **`pending` and
  `not pushed` are honest values**; `assumed green` is not. A row is written with `pending` at
  step (7) item 4 — before the push, which is what lets the doc gate go green — and the watched
  verdict replaces it in the named verdict commit at step (7) item 8.
- **Status** `complete (with carry-forward)` means the sprint closed with known follow-ups
  registered and routed. That is a normal outcome, not a failure — an unregistered follow-up is
  the failure.
