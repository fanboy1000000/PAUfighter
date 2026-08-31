---
name: refine-requirements
description: Clarify what is actually needed before planning or coding on PAUfighter, then review that clarification through both lenses before acting on it. This is the Pre-Implementation Gate from CLAUDE.md — steps (0) and (0b) of docs/WORKFLOW.md. Trigger whenever the owner asks to build, create, implement, fix, add, update, change, or develop anything non-trivial. Skip only when the task is mechanical with an obvious fix.
---

# Refine Requirements — steps (0) and (0b)

## Why this exists

The expensive defects in this project will not be typing mistakes. They will be
misunderstandings that got built: the wrong thing, built well, reviewed carefully, and shipped.
No amount of code review catches that, because the code correctly implements the wrong idea.

This gate is the cheapest correction point in the whole loop. Fixing a sentence here costs a
minute. Fixing the same misunderstanding after it has been planned, built, reviewed, and merged
costs a sprint.

## When to run it

**Run it** before planning or coding any request to build, create, implement, fix, add, update,
change, or develop something.

**Skip it** only when the task is mechanical with an obvious fix — a typo, an error message
pointing straight at its own cause, or a direct instruction like "rename `x` to `y`". When you
skip, write one line in the sprint log saying you skipped and why. A skip on the record is fine.
A silent skip is how a gate stops existing.

---

## Step (0) — CLARIFY

### 1. Work out the real need

Read past the literal words:

- What problem is the owner actually solving? Not which feature they named.
- Why now? What changed?
- What will they wish they had asked for in three months?
- What do they not know they need — the gap between the request and how the domain really works?

Then cross-reference against what already exists:

- `docs/CONVENTIONS.md` — which invariants does this touch? Could any reading of the request
  break one?
- `docs/knowledge-base/INDEX.md` — is there an ADR that already constrains this?
- `ROADMAP.md` — is this already in the backlog, possibly in a better-thought-out form?
- `docs/operations/finding-register.md` — is there an open finding in the same area?

### 2. VERIFY every factual claim against the code

**This is the part that gets skipped, and it is the part that matters most.**

Never assert what a file contains, what a function does, what a test covers, or what a
dependency provides unless you have read it in this session. Not "I recall", not "it presumably",
not "the naming suggests". A refinement built on a remembered fact is a refinement that produces
a plan that produces a defect, and the error is three steps upstream by the time anyone notices.

For anything non-trivial, dispatch **read-only reconnaissance subagents** rather than guessing:

    Agent(subagent_type: "Explore",
          prompt: "Find every place in src/ that <specific question>.
                   Report file paths and searchable symbol names.
                   Do not modify anything.")

Send several at once when the questions are independent. Build the refinement on what they
report back, and say in the refinement which claims were verified and how.

### 3. Sort every ambiguity into Propose or Ask

**Propose** — when there is a clear best answer within the invariants, the ADRs, and the ranked
trade-offs. State it as a decision the owner can object to. Do not make the owner design the
solution; that is the work, not the question.

> *"The dice roller will be injected into `simulateFight` as an argument rather than imported,
> because I1 requires the core to take all randomness from outside itself."*

**Ask** — when the answer depends on owner intent, taste, scope appetite, or a genuine fork with
real trade-offs.

> *"Should a knockout end the fight immediately, or should the fight always run its full
> distance and a knockout just decide the result? Immediate is more dramatic and simpler to
> implement; full-distance makes round-by-round statistics comparable across fights. I lean
> immediate — it matches 'shipping speed' and it is what a viewer expects."*

Always give options, trade-offs, **and a recommendation**. A bare "A or B?" pushes the work back
onto the owner, which is the opposite of the point.

**The test:** could the owner reasonably disagree with your proposal? If yes, ask. If no, propose.

### 4. Write the block

    **What was asked**
    One sentence — the literal request.

    **What is actually needed**
    One to three sentences — the interpreted need, including anything the owner did not
    say but that the request requires. May be broader or narrower than what was asked.

    **Proposed approach**
    Three to five bullets. Specific: name files, functions, invariants. This is a
    hypothesis, not a question.

    **Open questions** — decisions only the owner can make
    Numbered. Each with options, trade-offs, and a recommendation.
    If there are none: "None — all ambiguities resolved by the invariants and ADRs."

    **Assumptions** — correct me if wrong
    Numbered statements, not questions. The owner scans and flags anything wrong.
    Include the ones that feel too obvious to state; those are the ones that bite.

    **Acceptance criteria**
    A falsifiable checklist. Each item must be something that can be shown false.
    "The engine works" is not a criterion. "Two runs with seed 42 produce identical
    logs" is.

    **Risks**
    What could go wrong, what this conflicts with, what has non-obvious consequences.
    With a mitigation where one is known.

    **Readiness: READY | NEEDS CLARIFICATION**
    READY — every ambiguity has a proposed resolution; proceed unless the owner objects.
    NEEDS CLARIFICATION — name the one or two blocking unknowns that cannot be assumed.

---

## Step (0b) — REVIEW THE CLARIFICATION

Mandatory for anything substantive. A refinement carrying the wrong scope wastes every step
after it.

### Procedure

1. **Write the block** to `.claude/refinements/REFINEMENT-<slug>.md`. Use a short descriptive
   slug: `s2-knockout-rules`, `rng-injection`. This directory is gitignored — it is working
   material, not a record. What survives goes into the sprint log.

2. **Run both lenses, in parallel.**

   **External — Codex:**

       codex exec "Review the refinement at .claude/refinements/REFINEMENT-<slug>.md
                   for PAUfighter, a browser fight simulator governed by five invariants:
                   I1 determinism (all randomness from one seed, nothing else),
                   I2 stats monotonic (raising a stat never lowers the win rate),
                   I3 no hidden favouritism (corner order must not matter),
                   I4 no silent failures, I5 every fight explains itself via an event log.
                   Look for: scope drift, missing exclusions, weak or unfalsifiable
                   acceptance criteria, unstated assumptions, invariant risks not named.
                   Report findings as BLOCKER / WARNING / NOTE. Cite searchable names,
                   never line numbers. Do not modify any file."

   **Internal — Reviewer Agent:** spawn per `docs/AGENTS.md`, with the refinement file as
   REVIEW SCOPE and `docs/CONVENTIONS.md` included verbatim.

3. **Both lenses return BLOCKER / WARNING / NOTE** in the format defined in `docs/AGENTS.md`.

4. **Resolve every BLOCKER** by editing the refinement, then re-review.

5. **Cycle cap: two correction rounds per lens.** Every edit gets a verifying re-review, so
   round 2 always runs to check round 1's edit. **If round 2 surfaces new BLOCKERs, stop and put
   the remainder to the owner** — do not start a third round on your own initiative. The owner
   chooses: keep iterating, accept the remainder, or defer it to the finding register.

6. **If `codex` is unavailable, halt and tell the owner.** Never continue silently on one lens.
   A dual review that quietly became a single review is worse than an honest single review,
   because the record claims two.

7. **Show the owner** the refinement together with the findings, under a
   `**Review findings (0b)**` heading, one list per lens. Then proceed to step (1) of
   `docs/WORKFLOW.md`.

---

## What good looks like

A refinement is doing its job when at least one of these is true:

- It changed what gets built, before anything was built.
- It surfaced an open question the owner had not considered.
- It caught a factual assumption that turned out to be wrong when checked against the code.

A refinement that restates the request in more words and declares READY has not done its job. If
that is what you have, you probably transcribed rather than interpreted — go back to step 1.
