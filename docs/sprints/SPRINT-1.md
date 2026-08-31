# Sprint 1 — Governance harness + the seeded dice roller

| Field | Value |
|---|---|
| **Status** | in progress — records written, all four gates green, awaiting the owner's word to push (step 7 item 6) |
| **Dates** | 2026-08-31 → |
| **Goal** | Stand up the multi-agent governance harness, and prove it works by taking one small real change all the way through the loop: a seeded dice roller that makes invariant I1 true at the foundation. |
| **Owner approved** | no |

## What this sprint is, in one paragraph

Two things happened. First, the governance harness was built: the invariant model, the workflow
loop, the agent definitions, the knowledge base, the registers, the doc-consistency gate, and CI.
Second — and this is the part that matters — a small real change was taken through that loop end
to end, so the harness is demonstrated rather than asserted. The change is `src/core/rng.ts`, the
seeded dice roller. It was chosen because it is genuinely small (one module) and because
**invariant I1, determinism, either holds here or it holds nowhere**: every later part of the
fight engine draws its randomness from this module, so if it is wrong, no test written afterwards
can recover determinism.

## Clarification (0)

Full refinement: `.claude/refinements/REFINEMENT-s1-seeded-dice.md` (gitignored working
material). Summary:

- **Asked for:** a demonstration of the workflow, plus the owner's stated wish for dice-roll
  randomness driven by a seed.
- **Actually needed:** a seeded generator in `src/core/` taking no randomness from the
  environment, with the dice vocabulary the future fight engine will use.
- **Verified against the code** rather than assumed: `src/core/` is empty; `package.json` has no
  `dependencies` key at all; `vite.config.ts` collects tests from **two** patterns
  (`src/**/*.test.ts` and `tests/**/*.test.ts`) — the second turned out to matter.
- **Readiness:** initially declared READY with an open question still open. Codex flagged that as
  a BLOCKER. It was a process error, and the flag was correct.

## Clarification Review (0b)

Two lenses, two rounds each. **The gate was not decorative: it changed what got built.**

| Lens | Round | BLOCKER | WARNING | NOTE | Verdict |
|---|---|---|---|---|---|
| Codex | 1 | 2 | 3 | 2 | Findings raised |
| Reviewer | 1 | 2 | 5 | 2 | Findings raised |
| Codex | 2 | 0 | 1 | 1 | Round-1 findings verified resolved |
| Reviewer | 2 | 0 | 6 | 5 | Round-1 findings verified resolved |

Round 2 surfaced **no new BLOCKERs**, so the cycle cap was not reached and nothing was escalated
to the owner. All round-2 WARNINGs and NOTEs were folded into the refinement.

### The four BLOCKERs

| # | Lens | Invariant | Finding | Resolution |
|---|---|---|---|---|
| B1 | both | I1 | **Seed domain undefined.** The plan said "seeds are integers" but validated only against non-finite values. Under mulberry32 every operation coerces through 32-bit arithmetic, so `createRng(0.5)` and `createRng(0.9)` would produce byte-identical streams while `seed` faithfully reported two different numbers — the seed would not be a unique key to a fight, which is the property I1 exists for. | Seed domain fixed at integer `[0, 4294967295]`; out-of-domain throws. |
| B2 | Codex | I5 | **Declared READY with an open question open.** `rollMany` returning a sum would permanently discard the individual dice the event log needs, and no acceptance criterion pinned its contract either way. | Escalated to the owner as ruling **S1-R1** *before* build. |
| B3 | Reviewer | I1 | **No known-answer vector.** Comparing two instances of the same build proves they are consistent, not correct. A Sprint-4 algorithm swap would leave every test green while every seed anyone had written down silently meant a different fight. | Golden-sequence criterion pinning literal values, named as an ADR-level contract. |
| B4 | Reviewer | criterion 8 | **The plan contradicted itself.** It told the implementer to record mulberry32's weakness in a module comment, and separately required the file to contain no reference to `Math.random` or `crypto`. The natural comment fails the test beside it — and the implementer would have discovered that at the end and quietly deleted one or the other. | Comments stripped before matching, **and** the comment worded without naming the banned APIs. |

### Round-2 findings worth recording

Round 2 exists because a fix is itself a change. It earned its place:

- **The gloss added to satisfy a round-1 NOTE was itself wrong.** It claimed mulberry32 "uses only
  integer operations"; it divides by `2 ** 32` at the end. The conclusion held — the state
  transitions are defined 32-bit operations and the final scaling is by an exactly representable
  power of two — but the stated reason was inaccurate. Corrected.
- **The guard test would have matched its own source.** Widening the scan to `src/core/**/*.ts`
  (a round-1 fix) meant a guard placed in that tree would find its own search patterns and fail
  on first run. Moved to `tests/no-environment-access.test.ts`.
- **A finding was marked resolved when it was not.** Round 1's "grep is weak enforcement" was
  answered with "we widened the glob", which does not address `const { random } = Math`. Round 2
  rejected that and it was resolved properly with a runtime trap.
- **The fairness band would have failed a fair die roughly one run in four**, and the seeds were
  unnamed — so the natural repair would have been to try seeds until the test greened, at which
  point it certifies the seed choice rather than the die. Five seeds named in the criterion;
  band widened to about ±4 standard deviations on the pooled sample.
- **`D1` collided** with ADR-001's own D1–D5. Relabelled `S1-R1`.

## Decisions (1)

| # | Question put to the owner | Ruling | Recorded in |
|---|---|---|---|
| S1-R1 | Should `rollMany(count, sides)` return the individual dice, both dice and sum, or just the sum? | **The ordered array of individual dice.** The sum is one `reduce` away at the call site; the dice cannot be recovered from a sum. Since I5 requires a fight to explain *why* someone won, discarding them would cap how well any fight log could ever read. | This log; the refinement |
| S1-R3 | Round 2 of the **closing** review surfaced two new BLOCKERs, all nine findings being documentation self-consistency born in the previous fix batch. Options: (a) fix all nine and close without a round 3, recording the fixes as unverified, and add a termination rule; (b) fix only the two BLOCKERs and register the other seven; (c) keep iterating until both lenses are clean. | **(a).** Every one of the nine is correct and mechanical, none touches code or an invariant, and the suite stayed green throughout. Option (c) was declined because there is no evidence the sequence converges: round 1 fixed twelve and created nine. Option (b) was declined because leaving seven known-wrong statements in place would be a strange close for a sprint whose recurring defect was documents claiming more than they deliver. **The termination rule is the real output of this ruling** — the cap firing twice was a symptom of a missing rule, not of insufficient rigour. | This log; `docs/WORKFLOW.md` step (5) |
| S1-R2 | Round 2 of the high-risk review surfaced a new BLOCKER, which trips the cycle cap. Options put to the owner: (a) one scoped fix round — close the spy-restore hole, add a load-phase positive control, correct the overclaiming comments, defer the two cosmetic findings; (b) correct only the comments and accept the hole on the record; (c) keep iterating until both lenses return no findings. | **(a), one scoped fix round.** The comment corrections were mandatory under any option — a guard claiming more coverage than it has is worse than an honest narrower one, because it stops anyone looking. The spy-restore fix was small and closed a real hole. Option (c) was declined as polishing the guard instead of building the game; option (b) was declined because the fix was cheap. | This log; `F-004`; `PAT-001` correction |

Earlier owner rulings from the setup interview are recorded as ADR-001 (the stack and the DOM-free
core) and ADR-002 (five invariants; the privacy invariant removed).

## Plan (2)

| Task | Agent | File scope | Invariants at risk | Depends on |
|---|---|---|---|---|
| TASK-101 | Core Engine | `src/core/rng.ts` | I1, I4 | — |
| TASK-102 | Test & QA | `src/core/rng.test.ts`, `tests/no-environment-access.test.ts` | I1, I4 | TASK-101 |

Sequential rather than parallel: TASK-102 must pin the golden sequence that TASK-101 produces, so
their scopes are disjoint but their order is not.

### TASK-101 — the generator

Acceptance criteria are the contract table and domain rules in the refinement. In short: `Rng`
with `next` / `roll` / `rollMany` / `seed` / `draws`; mulberry32; every domain violation throws
naming the offending value; `roll` consumes exactly one `next()`.

### TASK-102 — the proof

Criteria 1–15 of the refinement, including the golden sequence, the fairness check over five
named seeds, the full I4 boundary set, the environment text scan, and the runtime trap.

## Build (3)

Five agent tasks. TASK-101 and TASK-102 were the plan; TASK-103 through TASK-105 came out of the
review gates.

### TASK-101 — the generator

| Field | Value |
|---|---|
| **Status** | complete |
| **Agent** | Core Engine |
| **Files changed** | `src/core/rng.ts` — new. `Rng` interface, `createRng` factory, mulberry32 stream, `roll`/`rollMany`, domain guards, module comment written for a product manager. |
| **Acceptance** | All 8 criteria met. Verified against an independently transcribed mulberry32: zero mismatches over 700,000 values across seven seeds. |
| **Cross-domain dependency reported** | **`tsconfig.json` did not include `tests/`**, so `npm run typecheck` would silently not have covered the environment guard placed there — the gate would have been reporting on a smaller surface than anyone reading it assumes. The agent reported it rather than editing out of scope; the Orchestrator fixed it. |

### TASK-102 — the proof

| Field | Value |
|---|---|
| **Status** | complete |
| **Agent** | Test & QA |
| **Files changed** | `src/core/rng.test.ts`, `tests/no-environment-access.test.ts` — both new. |
| **Acceptance** | All 15 criteria met. 47 tests. |
| **Cross-domain dependency reported** | none — no implementation defect found. |

### TASK-103 — apply high-risk findings to the generator

| Field | Value |
|---|---|
| **Status** | complete |
| **Agent** | Core Engine |
| **Files changed** | `src/core/rng.ts` — `-0` canonicalised to `0`; `draws` exactness bound documented; `MAX_SIDES` comment's false reason replaced with the true one and measured figures. |
| **Acceptance** | Met. Golden sequence confirmed unchanged under `Object.is`, before and after. |
| **Notable** | While fixing a comment that gave a plausible-sounding wrong reason, the agent wrote a replacement with a *different* plausible-sounding wrong reason ("the first few faces" get the extra chance; for a d6 it is faces 1, 2, 4 and 5). It caught this only by computing the per-face bucket counts rather than reasoning about them. |

### TASK-104 — apply high-risk findings to the tests

| Field | Value |
|---|---|
| **Status** | complete |
| **Agent** | Test & QA |
| **Files changed** | `src/core/rng.test.ts`, `tests/no-environment-access.test.ts`. |
| **Acceptance** | Met. 47 → 85 tests. Four break-and-restore experiments proved the new positive controls actually control. |

### TASK-105 — close the guard hole (owner ruling S1-R2)

| Field | Value |
|---|---|
| **Status** | complete |
| **Agent** | Test & QA |
| **Files changed** | `tests/no-environment-access.test.ts` — randomness spies held across the whole suite instead of restored between phases; load-phase positive control; three overclaiming comments corrected. |
| **Acceptance** | Met. 85 tests, no delta (the new control is an assertion inside `beforeAll`, not a new `it`). |
| **Notable** | The agent **corrected the reviewer's mechanism claim with evidence.** Three counterfactual runs through the real file showed the hole was reachable via `spy.mockRestore()` but *not* via `vi.restoreAllMocks()`, which in Vitest 4.1.11 never calls `mockReset()`. The hole was latent, not open. Registered as `F-006`, because Vitest's documentation says otherwise and aligning them would open it with no diff here. |

## High-Risk Review (4)

**Surface: random number generation and seeding** (I1, I3) — per the invariant-surface table in
`docs/WORKFLOW.md`.

| Round | Lens | BLOCKER | WARNING | NOTE | Outcome |
|---|---|---|---|---|---|
| 1 | Codex | 2 | 2 | 1 | Fixed in TASK-103 / TASK-104 |
| 1 | Reviewer | 1 | 4 | 7 | Fixed in TASK-103 / TASK-104 |
| 2 | Codex | 1 | 0 | 0 | **New BLOCKER — cycle cap reached, escalated to owner** |
| 2 | Reviewer | 0 | 4 | 1 | Same underlying issue, traced to its mechanism |

### The three round-1 BLOCKERs

- **Runtime trap ran after static import** (Codex). Traps went up in `beforeEach`; the module was
  already loaded. Module-scope environment access executed untrapped.
- **Pattern list too narrow to carry its claim** (Codex). No `globalThis`, `navigator`,
  `location`, `indexedDB`, `WebSocket`, and no import check — so it enforced neither "no
  environment access" nor "zero runtime dependencies".
- **The scan had no positive control** (Reviewer). Nothing proved the detector could detect. The
  *trap* half had exactly this treatment, so the technique was known and applied to one half only.
  A typo in the pattern list would have left every test green forever.

### Round 2 and the cycle cap

Round 2 surfaced a new BLOCKER: the guard's comments claimed the runtime trap catches "every
other spelling", which is false for computed module-scope access. The reviewer traced the deeper
mechanism against Vitest's source — a restored spy leaves a captured reference pointing at the
real function, so a core module that captured a random source at load time would leave the whole
suite green over a non-deterministic core.

**Per the cycle cap, the Orchestrator stopped and put the remainder to the owner** rather than
starting a third round. Ruling **S1-R2** above.

Findings not fixed: `F-002`, `F-003`, `F-004`, `F-006` — all registered with dispositions.

## Closing Review (5)

Both lenses over the **whole** change set — governance, records, tooling, CI and code together.
This gate earned its place decisively: **every finding was a contradiction between two files, and
none was visible from inside either one.**

| Round | Lens | BLOCKER | WARNING | NOTE | Outcome |
|---|---|---|---|---|---|
| 1 | Codex | 1 | 6 | 1 | Fixed below |
| 1 | Reviewer | 1 | 6 | 5 | Fixed below |
| 2 | Codex | 2 | 1 | 0 | **New BLOCKERs — cap reached again, escalated (S1-R3)** |
| 2 | Reviewer | 0 | 4 | 4 | All twelve round-1 fixes verified present; nine new items, all born in the fix batch |

### The BLOCKER — the loop could not be closed

Step (6) committed and pushed, then watched CI. Step (7) added the sprint's ledger row. But the
doc gate fails whenever a `SPRINT-N.md` exists without that row — and the log has existed since
step (0b). So **CI's `docs` job would have been red by construction on every sprint**, while
sprint mechanics say a red CI means the sprint is not closed and the only step that could turn it
green had already passed. The only way out would have been bypassing a gate, which rule 4 forbids.

Compounding it: steps (5) and `AGENTS.md` both said "step (7) commits only after step (5)
passes", while step (7) contained no commit at all. Three documents disagreed about which step
commits.

**Fixed** by moving the commit to the end of step (7), adding `pending` as an honest CI-verdict
value so the ledger row can be written *before* the push, and naming the verdict commit as an
expected part of closing rather than a fix-up.

### The other findings, all cross-file contradictions

| Finding | Lens | Fix |
|---|---|---|
| `deploy.yml` said "the gates run here too" but ran three of four, and manual dispatch bypassed CI entirely | both | Runs `npm run verify` — all four. The choice to gate publication on doc consistency is now stated deliberately. |
| `check-docs.mjs` matched a filename **anywhere** in an index, so a mention in prose satisfied an accounting requirement; and its "every link resolves" claim covered only category links | Codex | Completeness checks now require a **table row**; a new check resolves every relative link across the docs tree (37 checked). |
| ADR-001 claimed "TypeScript catches the `NaN` family at author time" — `number` includes `NaN`; runtime validation is what holds I4 | Codex | Dated amendment. |
| `AGENTS.md` required the Core Engine Agent to "return a structured event log alongside every result" — read literally, that declares `roll(6)` non-compliant. I5 is fight-level. | Codex | Both rules scoped to fight-resolution code, with the reason. |
| **The core-must-not-import-UI rule is enforced by nothing** for the spelling anyone would write. `../ui/render` passes the scan, the import check, and the runtime trap. The one caught spelling is one the build could not resolve anyway. | Reviewer | `F-005` opened, ADR-001 amended to say the rule is convention-enforced, routed to ROADMAP. |
| **`AGENTS.md` claimed reviewer read-only-ness was "enforced mechanically"** because `Explore` lacks `Edit`/`Write` — but it retains shell access | Reviewer | Restated honestly: it removes the *accidental* edit, which is the realistic failure. Real guarantee routed to ROADMAP. |
| **Owner ruling `S1-R2` was cited by two records and recorded nowhere** | Reviewer | Added to Decisions above. |
| `CLAUDE.md`'s off-limits list had drifted from `AGENTS.md`'s within one sprint, missing the build-config files — and `CLAUDE.md` is the file the Orchestrator reads when writing a task's scope | Reviewer | Deduplicated; one list, one place. |
| PAT-001 said "Rules 1 and 2 are not yet mechanically enforced" and two sentences later described the test enforcing rule 2 | Reviewer | Third dated correction. |
| The CI workflows were absent from the document map | Reviewer | Added, with `package.json`. |
| `vitest.setup.ts` was granted in the Test & QA scope but no `setupFiles` exists to load it | Reviewer | Dropped from the scope. |
| The finding format's `INVARIANT` field had no value for trade-off or test-integrity findings, both of which were raised this sprint and filed under invented values | Reviewer | Renamed `GROUNDS`, vocabulary widened to five kinds. |
| Generated-drift scanned only top-level `.md` | Codex | Recurses; scope documented. |
| PAT-001 metadata omitted I4 | Codex | Added, dated. |

### Round 2 — the cap fires again, and what that taught us

Round 2 confirmed **all twelve round-1 fixes are genuinely in the files**, and found **nine new
items, every one born in the fix batch itself**. Two were BLOCKERs, both in text written hours
earlier:

- **The ledger said `complete (with carry-forward)` while the sprint log said `in progress`,
  owner approved `no`, CI `pending`.** The reordering created a window in which a row must exist
  for a sprint that is by definition not closed, and item 4 said what to put in the CI column but
  nothing about `Status`.
- **The verdict commit's own CI run is unwatched — an infinite regress in the fix for the
  circularity.** Every verdict commit is a push, every push is a run, every run has a verdict.

And one that is the forcing mechanism catching itself: **`Record (7)` claimed the unmet criterion
15 was routed to ROADMAP; it was not there.** The only trace of the follow-up was the claim that
it had been recorded — worse than never mentioning it, because a reader checking the Backlog
concludes nothing is outstanding.

**The generalisable finding, and the reason the workflow changed:** documentation review does not
converge the way code review does. Fixing a document means writing more document, and the new
prose is new surface for the next round — correctly, every time. Round 1 fixed twelve and created
nine. There is no evidence the sequence terminates quickly, and the code sat stable and green at
85 tests throughout.

**Owner ruling S1-R3** (see Decisions): apply all nine, close without a round 3, and add the
missing piece — a **documentation termination rule** in `docs/WORKFLOW.md` step (5). Doc-only
findings get one fix round, then the remainder is registered rather than re-reviewed;
code-adjacent findings keep the 2-round cap.

> **These nine fixes were applied WITHOUT a verifying review round.** That is a deliberate,
> owner-authorised deviation from "every edit gets a verifying re-review", and it is recorded
> here rather than glossed. All nine are documentation and configuration; none touches the
> simulation, the tests, or an invariant; the suite stayed at 85 green across all of them. An
> unverified fix on the record is honest. An unverified fix presented as reviewed is not.

## Verification (6)

`npm run verify` — all four gates green.

| Check | Result |
|---|---|
| typecheck | clean |
| tests | **85 passing (+85 vs Sprint 0 — first sprint, no prior baseline)** |
| build | clean, 0.83 kB JS |
| doc gate | clean — 4 checks, 0 failures: KB INDEX complete (3 records in table rows, 0 orphans, 0 dangling) · sprint ledger complete (1 log in table rows) · **local links resolve (38 checked across 14 documents)** · generated-doc drift dormant |
| **CI verdict** | see the CI section below |

### CI run 1 — `a2a53a0` — **RED**, and the local gate could not have seen it

Pushed on the owner's word. Both workflows failed, and the failure is worth recording in full
because it is the first thing this project learned from CI that it could not have learned locally.

| Job | Result |
|---|---|
| `Code — types, tests, build` | **success** — typecheck, 85 tests, build all green on Linux |
| `Doc consistency` | **failure** — `Doc-consistency gate` step |
| `Deploy → Build site` | **failure** — `All four gates` step; `Publish` **skipped** |

**Cause:** `docs/knowledge-base/failures/` was empty. **Git cannot store an empty directory**, so
it is absent from every clone, while `INDEX.md` links to it. On the working tree the directory
exists and the link resolves; on CI's fresh checkout it does not. **The local gate was checking
the working tree, which is not what a clone gets** — so this was structurally invisible locally,
not an oversight in running it.

**Fixed forward in-sprint** (per step (7): a red CI means fix forward and repeat from step 6):
a `.gitkeep` keeps the category present, and `checkLocalLinks` now flags any link to an empty
directory with the reason. Falsified in both directions before re-pushing. Registered as `F-007`.

**Two things the design got right, worth noting because they are easy to take for granted:**

- **`Publish` was skipped.** Nothing reached the published site from a red repository. That is the
  whole reason the deploy workflow runs all four gates rather than three — a decision made at the
  closing review a few hours earlier, on a finding that looked pedantic at the time.
- **The jobs are independent**, so the green `Code` result was still visible rather than being
  swallowed by the red one. The signal that mattered — the code is fine, the docs are not —
  survived.

| **CI verdict** | run 1 on `a2a53a0`: **red**, cause found and fixed forward. Run 2 pending on the fix commit. |

The link count is recorded as a number rather than a word so a later drop in coverage is visible
as a number — the gate's own lesson, applied to the gate's own evidence.

Test progression within the sprint: 0 → 47 (TASK-102) → 85 (TASK-104) → 85 (TASK-105, no delta;
its new control is an assertion inside `beforeAll`, not a new `it`). One net test deletion in
TASK-104 — a standalone 3-test stream-preservation block, verified by the reviewer as strictly
subsumed by the 50 folded assertions, which pin the next *value* rather than only the count.

**Criterion 15 not met:** the golden sequence has not been pasted into a browser console. It is
the one cross-engine confirmation the Node-only suite cannot make, since `vite.config.ts` sets
`environment: "node"`. **Routed to `ROADMAP.md`'s Backlog** — and the round-2 closing review
caught that this sentence originally claimed the routing without the row existing, which is
exactly the failure the forcing mechanism is for.

## Record (7)

**What changed, in plain language.** PAUfighter went from an empty directory to a governed project
with a working, provably deterministic dice engine. The governance is not decoration: over the
sprint the gates found four BLOCKERs before any code was written, three more in the code, and a
structural flaw in the workflow itself that would have made every future sprint unclosable. The
dice engine is 200 lines and has 85 tests, because the five invariants are claims about
*distributions* and about *what happens when things go wrong* — neither of which a handful of
example tests can establish.

The single most useful thing learned: **the recurring defect in this sprint was not broken code,
it was documents and tests claiming more than they delivered.** A comment with a plausible wrong
reason, a scan that could not prove it could detect, a guard whose green tick meant less than it
appeared, a workflow step that named a gate it did not run. Every one of those reads fine in
isolation and survives review, which is exactly why the second lens and the whole-set review earn
their cost.

**Findings registered.** `F-001` through `F-006` in `docs/operations/finding-register.md` — one
`open`, five `accepted`, each with a named revisit condition rather than an expiry date.

**Follow-ups routed to ROADMAP.md.** Seven rows: core/UI import enforcement (`F-005`), AST-aware
environment enforcement (`F-003`), a real mechanical guarantee for reviewer read-only-ness,
path-sort normalisation (`F-004`), the criterion-15 browser confirmation, and a Markdown link
parser for the doc gate. Each names the sprint that deferred it.

**Corrections to earlier records.** ADR-001 carries two dated amendments; PAT-001 carries three
dated corrections. None was rewritten in place.

**Owner actions outstanding.** Approve the push (step 7 item 6). Nothing has left the machine.
