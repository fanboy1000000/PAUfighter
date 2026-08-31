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
| [Sprint 1](SPRINT-1.md) | Governance harness + the seeded dice roller. Invariant model, workflow loop, agent definitions, knowledge base, registers, doc gate and CI — proven end to end on `src/core/rng.ts`. Gates found 4 BLOCKERs before any code, 3 in the code, and a structural flaw in the workflow that would have made every sprint unclosable. | in progress | 2026-08-31 → | **85 passing (+85 — first sprint, no prior baseline)** | run 1 `a2a53a0`: **red** (`F-007`, fixed forward) · run 2 `8ac20e2`: CI **green**, deploy red on an unset Pages source · run 3 pending |

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
