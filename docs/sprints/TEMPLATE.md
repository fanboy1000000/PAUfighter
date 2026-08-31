# Sprint N — <Title>

| Field | Value |
|---|---|
| **Status** | planning \| in progress \| complete \| complete (with carry-forward) |
| **Dates** | YYYY-MM-DD → YYYY-MM-DD |
| **Goal** | One sentence. What is true at the end that was not true at the start. |
| **Owner approved** | no \| yes — YYYY-MM-DD |

## Clarification (0)

The `refine-requirements` output in short, or a pointer to
`.claude/refinements/REFINEMENT-<slug>.md`. If step (0) was skipped under the mechanical-fix
exception, say so in one line and say why.

## Clarification Review (0b)

| Lens | Round | BLOCKER | WARNING | NOTE | Verdict |
|---|---|---|---|---|---|
| Codex | 1 | | | | |
| Reviewer | 1 | | | | |

Findings and what was done about each. Every BLOCKER must show its resolution.

## Decisions (1)

Owner rulings made before building, and where each is recorded. A ruling that constrains future
work becomes an ADR; the rest live here.

| # | Question put to the owner | Ruling | Recorded in |
|---|---|---|---|

## Plan (2)

| Task | Agent | File scope | Invariants at risk | Depends on |
|---|---|---|---|---|
| TASK-N01 | | | | |

### TASK-N01 — <title>

**Acceptance criteria** — falsifiable, each one a thing that can be shown false:

- [ ] …

## Build (3)

### TASK-N01 — <title>

| Field | Value |
|---|---|
| **Status** | complete \| partial \| blocked |
| **Agent** | |
| **Files changed** | |
| **Acceptance** | each criterion, met or not, with evidence |
| **Cross-domain dependencies reported** | |

## High-Risk Review (4)

Only if an invariant surface was touched. Name the surface. If none was touched, say so — an
empty section reads as a skipped step.

| Surface | Lens | BLOCKER | WARNING | NOTE | Resolution |
|---|---|---|---|---|---|

## Closing Review (5)

Both lenses over the whole change set.

| Lens | Round | BLOCKER | WARNING | NOTE | Verdict |
|---|---|---|---|---|---|
| Codex | 1 | | | | |
| Reviewer | 1 | | | | |

Findings, with disposition for each. Anything not fixed goes to the finding register with an ID.

## Verification (6)

| Check | Result |
|---|---|
| `npm run verify` | all four gates — typecheck, tests, build, doc consistency. State the actual outcome of each, not "pass". |
| — tests | **N passing (+D vs Sprint N-1's M)** |
| — doc gate | the `[ok]` lines, with the link count |
| **CI verdict** | `pending` \| `not pushed` \| watched to completion: green \| red |

**One command, named — not four copied.** `package.json` is the single definition of what the
gates are; a list copied into a document drifts from it silently. This template previously
enumerated all four and had already produced three different spellings of the typecheck gate
across two documents, which is precisely the drift it now avoids.

A bare test count hides regressions, so always give the delta. A bare "pass" on the doc gate
hides shrinking coverage, so give the link count — a number that falls is visible in a way that
a word is not.

`pending` is the value written at step (7) item 4, before the push. It is replaced by the watched
verdict in the item-8 verdict commit, at the same time as `Status` is promoted.

## Record (7)

**What changed, in plain language.** A paragraph a product manager can read and come away
knowing more about the system than before. Not a list of file names.

**Findings registered.** IDs and where they went.

**Follow-ups routed to ROADMAP.md.** Everything discovered and not fixed. Nothing may be left
only in the conversation.

**Corrections to earlier records.** Appended and dated; never edited in place.
