# PAUfighter — The Orchestrator Loop

> **Governance:** this document is Orchestrator-owned. No agent may modify it. Every step is
> mandatory unless the step itself says otherwise.

The invariant model lives in [CONVENTIONS.md](CONVENTIONS.md). Agent definitions live in
[AGENTS.md](AGENTS.md). This file is the loop.

**Why a loop at all.** Most defects in a small project are not typing mistakes — they are
misunderstandings that got built. The expensive ones are decided before any code is written. So
the loop front-loads: two of its steps happen before a single line is typed, and the review that
catches the most is the one on the *clarification*, not the one on the code.

---

## (0) CLARIFY — interpret the intent; do not transcribe it

Before planning or coding anything non-trivial, run the **`refine-requirements` skill**
(`.claude/skills/refine-requirements/SKILL.md`). It carries the full procedure. In summary:

- **Interpret, do not transcribe.** Ask what the owner actually needs, not just what they typed.
- **VERIFY every factual claim against the code.** Never assert what a file contains, what a
  function does, or what a test covers without having read it in this session. For anything
  non-trivial, dispatch **read-only reconnaissance subagents** (`subagent_type: "Explore"`) and
  build on what they report.
- **Output** the structured block: *What was asked / What is actually needed / Proposed approach
  / Open questions, as options with trade-offs and a recommendation / Assumptions / Acceptance
  criteria / Risks / Readiness*.

**Skip only when** the task is mechanical with an obvious fix. Record a one-line skip rationale
in the sprint log when you skip.

## (0b) REVIEW THE CLARIFICATION — both lenses, before acting on it

A clarification that bakes in the wrong scope wastes everything downstream. Reviewing it here is
the cheapest correction available anywhere in the loop.

Write the step (0) block to `.claude/refinements/REFINEMENT-<slug>.md` (gitignored), then run
**both lenses**, in parallel:

- **External lens — Codex.** `codex exec "<review prompt referencing the refinement path>"`.
  Catches scope drift, missing exclusions, weak acceptance criteria, hidden assumptions.
- **Internal lens — Reviewer Agent.** Spawn per [AGENTS.md](AGENTS.md) with the refinement file
  as REVIEW SCOPE. Catches invariant alignment, simplicity, fit with existing records.

Both return findings as **BLOCKER / WARNING / NOTE**.

- **Every BLOCKER must be resolved** before step (1) begins.
- **Cycle cap: 2 correction rounds per lens.** Every edit gets a verifying re-review, so round 2
  always runs to verify round 1's edit. If round 2 surfaces new BLOCKERs, **stop and put the
  remainder to the owner** — do not start a third round on your own. The owner chooses: keep
  iterating, accept the remainder, or defer it to the register.
- If the `codex` CLI is unavailable, **halt and tell the owner.** Never silently drop a lens.

Record the findings in the sprint log under `## Clarification Review (0b)`.

## (1) DECIDE — genuine forks go to the owner before anything is built

Separate every open question into two buckets:

- **Propose** — there is a clear best answer within the invariants and the existing records.
  State it as a decision the owner can object to. Do not make the owner design the solution.
- **Ask** — the answer depends on owner intent, taste, scope appetite, or a real fork with real
  trade-offs. Present options *with* trade-offs *and* a recommendation. Never a bare "X or Y?".

**The test:** could the owner reasonably disagree with your proposal? If yes, ask. If no, propose.

Every owner ruling is recorded — as an **ADR** in `docs/knowledge-base/decisions/` when it
constrains future work, otherwise in the sprint log's decision list. An unrecorded ruling gets
relitigated in three weeks.

## (2) PLAN — tasks with scopes, order, and falsifiable criteria

Write the plan into the sprint log. Each task carries:

- **ID** — `TASK-N01`, `TASK-N02`, … for sprint N.
- **Agent** — exactly one domain agent from [AGENTS.md](AGENTS.md).
- **File scope** — the exact files it may create or modify.
- **Order** — which phase it runs in, and what it depends on.
- **Acceptance criteria** — **falsifiable**. "The engine works" is not a criterion. "Calling
  `simulateFight` twice with seed 42 and identical fighters returns identical event logs" is.
- **Invariants touched** — which of I1–I5 this task could plausibly break.

## (3) BUILD — dispatch domain agents in parallel where scopes are disjoint

- **One agent per task.** Use the `Agent` tool. Agents with disjoint file scopes run
  concurrently, in a single message with multiple tool calls.
- **Every agent prompt contains [CONVENTIONS.md](CONVENTIONS.md) verbatim** — plus only the
  records the task actually needs. A prompt stuffed with everything is a prompt nobody reads.
- Use the prompt template in [AGENTS.md](AGENTS.md). It is not optional; it carries the scope
  declaration and the report-instead-of-act rule.
- **Accept nothing that does not build.** Run `npx tsc --noEmit` and `npm run build` on every
  agent output before accepting it. A failing output goes back to the agent that produced it,
  with the error text.

## (4) HIGH-RISK REVIEW — anything touching an invariant surface

Any change that touches an **invariant surface** gets its own dual review *before* it is merged
into the working set — not deferred to the closing review.

The invariant surfaces in this project:

| Surface | Invariants at risk | Typical files |
|---|---|---|
| Random number generation and seeding | I1, I3 | `src/core/rng.ts` |
| Fight resolution, damage, stat-to-outcome maths | I2, I3, I4 | `src/core/fight.ts`, `src/core/stats.ts` |
| The event log and its schema | I5 | `src/core/log.ts` |
| Anything in `src/core/` reading the clock, network, or global state | I1 | any of `src/core/` |

Both lenses, same BLOCKER/WARNING/NOTE format, same 2-round cap. Record under
`## High-Risk Review (4)` in the sprint log, naming the surface.

## (5) CLOSING REVIEW — both lenses over the WHOLE change set

After all tasks are built and step (4) reviews are resolved, review the **entire sprint diff**,
not the individual tasks.

This step exists because per-task review is structurally blind to a whole class of defect: two
tasks that are each correct alone and wrong together. A per-task reviewer cannot see it, because
it never sees both.

- **External:** `codex review "<prompt>"` with the sprint's work still uncommitted — the default,
  since step (7) commits only after this passes.
- **Internal:** Reviewer Agent with the full diff as REVIEW SCOPE.
- Same severities, same 2-round cap, same halt-and-ask-the-owner at the cap.
- Record under `## Closing Review (5)` in the sprint log, with each lens's verdict.

### The documentation termination rule

**A finding that touches only documentation gets ONE fix round. The remainder is registered, not
re-reviewed.** Findings that touch code, tests, config or CI keep the ordinary 2-round cap.

This exists because documentation review does not converge the way code review does. Fixing a
document means *writing more document*, and the new prose is new surface for the next round to
find fault with — correctly, every time. Sprint 1's closing review fixed twelve items and created
nine, all nine genuine. Without a stopping rule that is an unbounded loop over prose while the
code sits stable and green, which spends the top-ranked trade-off on the lowest-ranked outcome.

What the rule does **not** licence:

- **It is not a lower standard.** Every finding is still fixed or registered with a disposition.
  Registering is a decision on the record, not a way of not deciding.
- **It does not apply to a document that misstates what the code does.** That is a code-adjacent
  finding — the document is the interface to the behaviour — and it keeps the 2-round cap.
- **It does not apply to the invariant model, the workflow itself, or an ADR's decisions.** A
  contradiction in the rules is not a documentation nit.

When the rule is used, **say so in the sprint log**: which findings were fixed without a verifying
review, and that the fixes are therefore unverified. An unverified fix on the record is honest; an
unverified fix presented as reviewed is not.

## (6) VERIFY — run every local gate

    npm run verify

That one script runs all four gates, in this order: `typecheck` (`tsc --noEmit`), `test` (the
whole vitest suite), `build` (the production build must succeed), and `check:docs`
(`tools/check-docs.mjs`). **Name the script, not its four commands** — `package.json` is the
single definition, and a list copied into a document drifts from it silently.

All four must pass locally before step (7) begins.

**Nothing is committed or pushed at this step.** That happens at the end of step (7), for a
reason the next section explains.

## (7) RECORD, then commit — evidence, registers, index, and only then the push

> **Why the commit lives here and not in step (6).** The doc-consistency gate fails whenever a
> `SPRINT-N.md` exists without a row in `docs/sprints/INDEX.md`, and that log has existed since
> step (0b). Commit at step (6) and CI's `docs` job is **red by construction on every single
> sprint** — and sprint mechanics say a red CI means the sprint is not closed, while the only
> step that could turn it green has already been passed. The loop would be unclosable, and the
> only way out would be bypassing a gate, which rule 4 forbids. So the records are written
> first, and the push is the last thing that happens.
>
> *(This ordering was wrong in the first version of this document. It was caught by the closing
> review at the end of Sprint 1 — a defect visible only when the workflow, the gate script and
> the CI config were read together, which is exactly what step (5) is for.)*

In this order:

1. **The sprint log** (`docs/sprints/SPRINT-N.md`) gets its evidence:
   - **Test counts with deltas** — "34 passing (+9 vs S1's 25)". A bare count hides regressions.
   - **Review verdicts** — both lenses, every gate, every round, with what was found and done.
   - **Follow-ups** — everything discovered and not fixed.
2. **The finding register** (`docs/operations/finding-register.md`) gets every finding at or
   above the registration floor, with its disposition.
3. **ROADMAP.md** absorbs every follow-up not scheduled for the next sprint. This is the forcing
   mechanism: nothing is lost by being merely mentioned in conversation.
4. **`docs/sprints/INDEX.md`** gets the sprint's row, with **Status: `in progress`** and
   **CI verdict: `pending`**. Both are honest values for a sprint that is not yet closed — the
   push has not happened and the run has not happened — and writing the row now is what lets the
   doc gate go green *before* the push rather than after it. **Both cells are promoted together
   in item 8**, never separately: a row saying `complete` next to `pending` contradicts itself,
   and the sprint log it links would contradict it too.
5. **`npm run verify`** must pass, doc gate included. If it does not, the sprint is not ready.
6. **Commit and push — ONLY when the owner says so.** Not a formality: the owner decides when
   work leaves the machine.
7. **Watch the CI run to its actual verdict. Never assume green.** `gh run watch`, or
   `gh run list --limit 1`. A red CI that nobody reads is not enforcement; it is decoration.
8. **The verdict commit.** In one edit: replace `pending` with the watched verdict, promote
   `Status` from `in progress` to `complete` (or `complete (with carry-forward)`), and set the
   same fields in the sprint log's header. Commit that. **This second commit is expected and
   named** — part of closing a sprint, not a fix-up and not a bypass. Its message says what it
   is, e.g. `docs: record Sprint 1 CI verdict`.

   **This commit's own CI run is not watched, and that is a stated exception rather than an
   oversight.** Rule 3 below says CI's verdict is CI's — taken literally with no exception, the
   loop cannot terminate: every verdict commit is a push, every push is a run, every run has a
   verdict to record. The regress is broken here, explicitly, on these grounds: the commit's diff
   is confined to two cells of one table and the matching header fields, every gate ran locally
   at item 5, and the doc gate cannot break because the row still names the same sprint log.
   **If a future verdict commit ever touches more than that, this exception does not cover it** —
   watch that run.

**A sprint whose CI came back red is not closed**, whatever the local run said. Fix forward in
the same sprint and repeat from step 6.

**Never rewrite a closed record.** A sprint log, an ADR, or a register row that has been closed
stays as written — corrections are **appended and dated**. The record is what we believed at the
time; that is the whole value of having one.

---

## Sprint mechanics

- **Numbers are strictly sequential.** The next sprint is N+1. Never skip a number, never
  renumber a completed sprint.
- **Task IDs follow the sprint.** Sprint 3's tasks are `TASK-301`, `TASK-302`, …
- **A sprint opens** by copying [sprints/TEMPLATE.md](sprints/TEMPLATE.md) to `SPRINT-N.md` and
  filling in the goal.
- **A sprint closes** by completing step (7) in full — records written, ledger row added with
  `pending`, all four gates green, the owner's word given, the push made, CI watched to its
  verdict, and that verdict committed. A sprint whose CI came back red is not closed.

## The rules that have no exceptions

1. **No lens is ever silently skipped.** If a review tool is unavailable, halt and tell the owner.
2. **Commit and push only on the owner's word.**
3. **CI's verdict is CI's, not yours.** Watch the run.
4. **No gate is bypassed "just this once"** — not by an agent, not by the Orchestrator, not by
   the owner. A gate with a history of exceptions is a suggestion. If a gate is genuinely wrong,
   change the gate on the record; do not step around it.
