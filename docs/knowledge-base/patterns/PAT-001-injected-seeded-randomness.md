# [PAT-001] Injected seeded randomness: three rules the core must keep

| Field | Value |
|---|---|
| **ID** | PAT-001 |
| **Status** | accepted |
| **Sprint** | Sprint 1 |
| **Date** | 2026-08-31 |
| **Ruled by** | orchestrator |
| **Invariants** | I1, I4, I5 — *I4 added 2026-08-31 (closing review): rule 2 is an I4 rule and the metadata understated the record's coverage* |
| **Origin** | Proposed by the Core Engine Agent in TASK-101; accepted by the Orchestrator |

## Context

`src/core/rng.ts` is where chance enters PAUfighter, and invariant I1 (determinism) either holds
there or it holds nowhere — every later part of the fight engine draws its randomness from it.

ADR-001 already establishes the big constraint: the core is DOM-free and takes nothing from the
environment. But implementing the generator surfaced three narrower rules that ADR-001 does not
cover, and each has the same shape: it looks like implementation detail from the outside, so a
future contributor could break it while acting entirely reasonably, and **nothing would fail
loudly**. That combination — invisible from outside, silent when broken — is exactly what a
pattern record is for.

## The pattern

### Rule 1 — randomness is injected, never imported

The fight engine **receives** an `Rng`; it never imports a shared module-level one.

A shared generator is shared mutable state. The failure mode is silent and confusing: fight #2
comes out differently depending on whether anyone watched fight #1 first, because fight #1 moved
the shared stream. The seed printed on fight #2's log then reproduces something else entirely.

Nothing in the type system prevents a future contributor from adding
`export const rng = createRng(0);` as a convenience. It would look like a tidy-up.

**In practice:** one generator per fight, constructed at the start of that fight from that
fight's seed, threaded through as an argument.

### Rule 2 — validate before you draw

A rejected call must not move the stream. `roll` checks its arguments **before** taking a value
from the generator.

If validation happened after the draw, a single caught-and-handled error would shift every
subsequent event in the fight, and the seed would stop reproducing. The fight would still finish,
still name a winner, and still look fine. This is the I4 failure mode (silent continuation from a
wrong basis) hiding inside an I1 breach.

### Rule 3 — one roll consumes exactly one value

`roll(sides)` takes exactly one `next()`. `rollMany(count, sides)` takes exactly `count`.

This deliberately forecloses **rejection sampling** — the standard remedy for the tiny
lopsidedness of `Math.floor(next() * sides) + 1`, which works by discarding awkward values and
redrawing. Rejection sampling would make `draws` unpredictable, and a fixed one-roll-one-draw
accounting is what makes `draws` a usable replay position for the future fight engine.

**Someone will eventually propose rejection sampling as a fairness improvement.** This record is
what tells them why the answer is no, and what they would have to replace `draws` with first.

The cost is real but negligible — and it is worth stating precisely, because this record exists to
be handed to the next person who proposes rejection sampling, and a wrong number is the first
thing they will check. The bias grows with the die size: `2 ** 32 mod 6 = 4`, a relative excess of
about **one part in 715,827,882 for a d6**; `2 ** 32 mod 1000 = 296`, about **one part in
4,294,967 at the d1000 cap** — roughly 167 times larger. Both are orders of magnitude below the
fairness band the test suite uses.

> **Correction, 2026-08-31 (high-risk review, Sprint 1).** This paragraph originally read "roughly
> one part in 700 million at die sizes up to 1000", which attached the d6 figure to the d1000 case
> and understated the cap by two orders of magnitude. Corrected above; the conclusion is unchanged.

## What we gave up, and why

**Rule 1** costs an argument on every function that needs luck. Accepted: the alternative is a
convenience import whose failure is invisible until someone notices two fights that should match
do not.

**Rule 3** costs a measurable, permanent, microscopic bias in every die. Accepted in exchange for
a trustworthy replay position. If a future feature needs perfectly unbiased dice more than it
needs replay, that is an ADR-level trade, not a quiet fix.

## How this is enforced

- `tests/no-environment-access.test.ts` scans every core source (`.ts`, `.mts`, `.cts`, `.tsx`,
  `.js`, `.mjs`, `.cjs`, `.jsx`, excluding tests) for environment access **and** traps
  `Math.random`, `Date.now`, `performance.now`, and `crypto.getRandomValues` at runtime. The two
  halves cover different spellings, and **which one covers what depends on scope** — stated
  precisely below, because an unqualified claim here is the wrong kind of wrong in the one record
  written to be handed to the next contributor.

  | Spelling | Caught by |
  |---|---|
  | `Math.random()` written plainly | the text scan |
  | `Math["ran" + "dom"]()` called inside a function | the runtime trap, exercise phase |
  | `const { random } = Math` **at module scope** | the runtime trap, **load phase** — the scan cannot see it, because the destructuring form never spells `Math.random` |
  | An obscured **clock** read at module scope | **neither.** Tracked as `F-003` in the finding register |
  | `import.meta.env.DEV` | the text scan only — `import.meta` is syntax, not a stubbable object, so no runtime trap can ever cover it |

> **Correction, 2026-08-31 (high-risk review round 2, Sprint 1).** This section previously said
> "the trap catches spellings the scan cannot see, such as `const { random } = Math`" without
> qualification. That was true for a capture inside a function body and false for one at module
> scope, which at the time evaded both halves — the load-phase spies were restored before the
> exercise phase, leaving the captured reference pointing at the real function. The guard was
> fixed (owner ruling S1-R2) and the claim replaced with the table above.
- The golden-sequence test pins the first 10 outputs of `createRng(42)` as literals. Any change
  to the algorithm — including a well-intentioned one — fails loudly.
- `draws` accounting is pinned by test, so a change to rule 3 breaks the suite rather than
  quietly changing every future fight.

**Rule 1 is not yet mechanically enforced.** It becomes enforceable once the fight engine exists
(a test that runs the same fight twice from a fresh generator each time).

**Rule 2 is enforced**, by `expectStreamUnmoved` in `src/core/rng.test.ts`, applied to every
rejection case rather than spot-checked. It walks a reference generator to the same position,
asserts the throw, asserts `draws` is unmoved, **and** asserts the next value is the one that
should have come next — so a validation-after-draw regression fails on the value, not just the
count.

> **Correction, 2026-08-31 (closing review, Sprint 1).** This paragraph previously opened "Rules 1
> and 2 are not yet mechanically enforced" and then, two sentences later, described the test that
> enforces rule 2 — telling the next contributor that one of this project's strongest guards did
> not exist. The section had already been corrected twice this sprint for adjacent inaccuracies
> and this one survived both, which is itself the lesson: a paragraph edited in pieces stops
> agreeing with itself, and only a reader taking the whole thing at once notices.

## Revisit when

The fight engine needs a generator positioned mid-stream (a resume or fork feature). That would
put pressure on rule 3, and the right response is a new ADR that replaces `draws` with an
explicit state snapshot — not a quiet change to the drawing discipline.
