# Sprint 2 — A roadmap several people can work from

| Field | Value |
|---|---|
| **Status** | complete |
| **Dates** | 2026-08-31 → 2026-09-01 |
| **Goal** | Turn the roadmap into a backlog colleagues can pick work from, and settle what binds a human contributor. |
| **Owner approved** | yes — 2026-09-01 |

## What this sprint is, in one paragraph

The owner asked for StatsTid's roadmap to be brought over, "especially since we will be multiple
people collaborating". Reading StatsTid's actual file first turned out to matter: **it is a
single-owner roadmap** — no item ids, no claim mechanism, no assignees, no definition of done,
because one person plus one orchestrator never needed them. Mirroring it faithfully would have
delivered the requested structure and missed the reason for the request. So this sprint did two
things: completed the shape PAUfighter was missing, and added the collaboration layer StatsTid
never had. It also surfaced a question bigger than the roadmap — whether a colleague fixing a typo
runs the whole nine-step loop — which the owner ruled on, and which is now `ADR-003`.

**No code changed.** 85 tests before, 85 after. This was entirely governance, which is why the
documentation termination rule applied at the closing review.

## Clarification (0)

Full refinement: `.claude/refinements/REFINEMENT-s2-collaborative-roadmap.md` (gitignored).

- **Verified rather than assumed:** StatsTid's roadmap is 241 lines in three sections and its
  backlog items carry no id of their own — the `SEC-NNN` ids it cites belong to its *finding
  register*. PAUfighter's was 79 lines with 6 backlog rows.
- **The round-1 review corrected a claim in this very section:** it said "nothing else in the
  repository claims to track work". False — `docs/operations/finding-register.md` does, with
  pickup triggers on four rows. The correction reshaped the whole design.

## Clarification Review (0b)

| Round | Lens | BLOCKER | WARNING | NOTE | Outcome |
|---|---|---|---|---|---|
| 1 | Codex | 0 | 5 | 1 | Fixed |
| 1 | Reviewer | 4 | 4 | 3 | Fixed |
| 2 | Codex | 1 | 1 | 0 | Resolved by owner ruling S2-R1 |
| 2 | Reviewer | 1 | 4 | 2 | Cap fired; fixes applied under the owner's standing propose-and-object instruction |

### The round-1 BLOCKERs

- **Criterion 7 would have shielded the only open finding.** It asserted `F-003` supersedes
  `F-005`. They are different obligations — `F-003` is the environment scan, `F-005` is import
  resolution and needs no AST — and declaring supersession would have parked a cheap fix behind
  `F-003`'s "revisit at ~five core files" trigger, with the core at two files. A collaborator would
  have correctly concluded there was nothing to do. That is "shield, not revisit", which the
  register forbids.
- **The design duplicated the finding register field for field.** `Done when` restated the
  Disposition, `Needs` restated the revisit trigger, `Claimed by` plus a strikethrough restated
  `in-progress`/`fixed`. Someone fixes `F-005`, ticks the roadmap, does not touch the
  Orchestrator-only register — and the register still says `open`. Resolved by making the register
  the single home: register-backed rows keep their `F-` id and carry a pointer, never a copy.
- **`Claimed by` as "a name and a date" breached CONVENTIONS §2** on a public repository. A
  colleague's real name in git history cannot be taken back. Now a GitHub handle.
- **`ROADMAP.md`'s header said Orchestrator-only** while the mechanism had humans editing it — a
  contradiction three sections apart in one file.

### Round 2 and the cap

Codex found that criteria 10 and 11 *mandated* pull-request claiming while `Readiness` called them
blocked on the unanswered question 1 — prescribing the disputed outcome. The owner's ruling
resolved it. The internal lens separately found that the new membership rule and criterion 6 could
not both hold: `F-003` and `F-004` are `accepted` with unfired triggers, so they failed the rule
while criterion 6 required all six rows to carry over.

**The cap fired.** Rather than send a fourth decision, the Orchestrator applied the owner's
standing instruction — propose the answer and let me object — and proposed widening the rule. That
first proposal was **wrong**, and checking the register caught it: excluding only
`fixed`/`wont-fix`/`superseded` would have pulled in `F-001`, `F-002` and `F-006`, none of which
has anything to do. The rule that works is *"names a concrete fix"*, which yields exactly the three
register-backed rows already present.

## Decisions (1)

| # | Question put to the owner | Ruling | Recorded in |
|---|---|---|---|
| S2-R1 | Do human collaborators go through the governance workflow? (a) full workflow for everyone; (b) invariants and CI bind everyone, the sprint loop is the orchestrator's process; (c) decide later. | **(b).** "Invariants and CI bind everyone, sprint loop is yours." | **[ADR-003](../knowledge-base/decisions/ADR-003-what-binds-a-contributor.md)** — an ADR rather than a log row, because it constrains all future work and three separate documents needed one citable source instead of three independent assertions. |

Questions 2 (claim by `Claimed by` column, not Issues) and 3 (no dates; `now`/`next`/`later`) were
put with recommendations and waved through.

## Plan (2) and Build (3)

**No domain agents were dispatched, and that is not a shortcut.** Every file in scope —
`ROADMAP.md`, `docs/WORKFLOW.md`, `CLAUDE.md`, `docs/AGENTS.md`, `docs/CONVENTIONS.md`,
`docs/sprints/`, `docs/knowledge-base/`, `docs/operations/` — is Orchestrator-only by shared rule
3. No agent could have carried this work without violating its own scope.

| Task | Files |
|---|---|
| TASK-201 | `ROADMAP.md` — rewritten: what-this-is-NOT block, governance line, `now`/`next`/`later` arc, ids, `Claimed by` / `Done when`, how-to-pick-something-up, reading notes |
| TASK-202 | `docs/WORKFLOW.md` step (7) item 3 — routing stays a step; the register-re-read destination |
| TASK-203 | `CLAUDE.md`, `docs/AGENTS.md`, `docs/CONVENTIONS.md` — permission and contributor-readership alignment |
| TASK-204 | `ADR-003`, register rows `F-008` / `F-009`, `docs/sprints/TEMPLATE.md`, the `SPRINT-1.md` correction |

## High-Risk Review (4)

**Not applicable.** No invariant surface was touched — no change to `src/core/`, the tests, or the
build. Stated rather than left blank, since an empty section reads as a skipped step.

## Closing Review (5)

| Round | Lens | BLOCKER | WARNING | NOTE | Outcome |
|---|---|---|---|---|---|
| 1 | Codex | 1 | 2 | 1 | Fixed below |
| 1 | Reviewer | 0 | 10 | 1 | Fixed below |

### The BLOCKER — a deadlock inside one file

**The governance line permitted contributors to edit only a `Claimed by` cell, while pickup step 2
required writing `Done when` before claiming.** So nobody could claim `B-001`: the required first
edit was reserved to the Orchestrator. `CLAUDE.md` and `AGENTS.md` repeated the narrower
permission, so all four files agreed on the wrong thing. The internal lens found two more acts
outside the grant — removing a row when work lands, and `B-002`'s criterion requiring a sprint-log
entry that contributors cannot write.

Two correct fixes, mutually incompatible: the "write `Done when` before claiming" rule came from
the routing-cost warning, and the governance split came from the Orchestrator-only contradiction.

**Fixed** by naming the contributor-writable surface as three edits — `Claimed by`, the `Done when`
of the row being claimed, and removing that row in the pull request that lands the work — defined
once in `ROADMAP.md` and pointed at from everywhere else.

### The other findings

| Finding | Lens | Fix |
|---|---|---|
| **`S2-R1` recorded nowhere, and no `SPRINT-2.md` existed** — the `S1-R2` defect recurring one sprint later, on a ruling with wider reach | Reviewer | `ADR-003` + this log |
| `docs/sprints/TEMPLATE.md` still carried the flat pre-amendment routing rule — the highest-leverage copy, executed every sprint without being re-read | Reviewer | Amended to point at step (7) item 3 rather than restate it |
| The forcing-function headline said "every deferred follow-up" after the workflow gained an exception | both | "every deferred follow-up **that has work someone could do**", with the rest named |
| `WORKFLOW` said "nothing concrete to do" while `ROADMAP` said "a concrete fix **someone could do now**" — the qualifier decided two of six rows | Reviewer | Dropped "could do now"; deferred-but-real rows carry **Not yet worth doing** and their trigger on the table |
| `F-004`'s item cell had already drifted from the register — unconditional where the register is conditional | Reviewer | Both `F-003` and `F-004` cut to scanning labels; the file now states the register is authoritative on any difference |
| **`B-` items are defect-shaped**, creating a second home for known defects — and `B-` rows are outside the register's sprint-close re-read | Reviewer | `B-001` → `F-008`, `B-002` → `F-009`. Ids not retired, per the migration rule |
| `F-003`'s `Done when` pointed at prose with no completion criterion, silently bypassing the write-it-before-claiming rule | Reviewer | Set to `—`; a new rule says a pointer is valid only when the target names a checkable end state |
| **CONVENTIONS §4 was never surfaced to contributors**, and no gate checks it | Reviewer | Pickup step 5 names it; `ADR-003` D3 records that it is unenforced |
| CONVENTIONS called itself "the one text every contributor receives" — Sprint 2 created a class of contributor that receives nothing verbatim | Reviewer | Header corrected: injected into agent prompts, required reading for humans |
| `SPRINT-1.md` said "Seven rows" and enumerated six; "each names the sprint that deferred it" stopped being true | Reviewer | Dated correction appended, not rewritten. Attribution restored as `(deferred SN)` in the item cell |
| `B-003`'s second branch was already half-met — the limit is stated in the script header | Codex | Reduced to what is left: the ADR |

> **Applied under the documentation termination rule** (`docs/WORKFLOW.md` step (5)), added at
> Sprint 1's close and used here for the first time. Every finding was documentation; doc-only
> findings get one fix round and the remainder is registered rather than re-reviewed. **These
> fixes therefore had no verifying review round.** Recorded plainly rather than glossed — the rule
> exists because doc review does not converge, not because the fixes are above scrutiny.

## Verification (6)

`npm run verify` — all four gates green.

| Check | Result |
|---|---|
| typecheck | clean |
| tests | **85 passing (±0 vs Sprint 1's 85 — no code changed)** |
| build | clean, 0.83 kB JS |
| doc gate | clean — 4 checks: KB INDEX complete (4 records) · sprint ledger complete (2 logs) · local links resolve · generated-doc drift dormant |
| **CI verdict** | **green** — run on `701d195`, watched to completion: CI and Deploy both success, site confirmed serving |

## Record (7)

**What changed, in plain language.** The roadmap became something a colleague can use: six items
with stable ids, a claim mechanism, and a written definition of done for each. More importantly,
`ADR-003` now answers a question the project could not previously answer — what binds someone who
is neither the owner nor an agent. The answer is that the invariants, CI and the conventions bind
them while the sprint loop does not, and the honest cost of that is recorded: **a contributor's
pull request gets no clarification step and no dual review, so it deserves a human read.**

The sprint's own lesson is narrower and sharper than Sprint 1's. Sprint 1 found that documents
claim more than they deliver. Sprint 2 found the specific way that happens when a document is
edited in pieces: **two individually correct fixes produced a deadlock**, because each was checked
against the problem it solved and neither against the other. Only reading the whole file at once
caught it.

**Findings registered.** `F-008` (reviewer write-permission) and `F-009` (cross-engine dice
confirmation), both `open`, both promoted from roadmap-only rows because the registration floor
takes every WARNING and roadmap rows are outside the register's re-read.

**Follow-ups routed.** None new. The Backlog holds six items, unchanged in substance.

**Corrections to earlier records.** `SPRINT-1.md` carries a dated correction for the seven-vs-six
miscount and the lost attribution. Nothing was rewritten in place.

**Owner actions outstanding.** Approve the push (step 7 item 6).
