# PAUfighter — Finding Register

> **Governance:** Orchestrator-only. One register for every finding, from every lens, at every
> gate. **Owner:** the project owner, together with the Orchestrator.

## Why this file exists

A finding that lives only in a conversation is a finding that will be rediscovered the hard way,
six weeks later, by someone who has to work it out again from scratch. Review output scrolls past
and is gone. This register is where it stops being ephemeral.

## Semantics — revisit, not shield

**A registered finding is picked up again. It is never automatically written off as settled.**

Being in this register means the finding is *known*, not that it is *handled*. A row is not a
defence. Specifically:

- Registering a finding **does not** close it, excuse it, or downgrade it.
- A row is only settled when its **Disposition** says so explicitly, with a date and a reason a
  reader can evaluate.
- **`accepted` is not `fixed`.** An accepted finding is a live cost the owner chose to carry.
  It stays visible.
- **Nothing here expires.** Age is not a disposition. A finding does not become acceptable by
  sitting in the register long enough.
- At each sprint close, every row that is not `fixed` or `wont-fix` is **re-read**, and its
  status confirmed or changed on the record.

## Registration floor

**Register every BLOCKER and every WARNING.** Register a NOTE when it would plausibly change a
future decision, mislead a reader, or come up again.

Below the floor: pure taste, one-off cosmetics, and anything already fixed within the same gate
round. Fixing it inside the round *is* the disposition; there is no value in a row that is born
closed.

## Reference style — searchable names, never line numbers

**Cite a searchable symbol, heading, or filename. Never a line number.** `simulateFight` in
`src/core/fight.ts` still finds the code in six months; `fight.ts:47` is wrong by the next
commit, and a register full of stale pointers teaches people to stop trusting the register.

## Severities

| Severity | Meaning |
|---|---|
| **BLOCKER** | Breaks an invariant (I1–I5) or fails a stated acceptance criterion. |
| **WARNING** | A real defect or real risk; no invariant is broken. |
| **NOTE** | Worth keeping: an improvement, a cleanup, or an observation. |

Severity ranks **engineering priority, not danger to anyone** — see the project status section of
`docs/CONVENTIONS.md`. This is an office gimmick; a BLOCKER means "the simulation cannot be
trusted until this is fixed", not "someone is at risk".

## Dispositions

| Disposition | Meaning |
|---|---|
| `open` | Registered, not yet acted on. |
| `in-progress` | Being worked, with a sprint named. |
| `fixed` | Corrected, with the commit or sprint that did it. |
| `accepted` | The owner ruled to carry it. **Requires a reason and a date.** Still live, still re-read at every close. |
| `wont-fix` | Ruled out of scope for good. **Requires a reason.** |
| `superseded` | Overtaken by a later finding or decision. Name the successor. |

## Register

| ID | Meaning in plain language | Severity | Grounds | Where | Found | Disposition |
|---|---|---|---|---|---|---|
| F-001 | We built a batch-dice function before anything needed one. The reviewer's case was that a feature with no caller cannot have its shape decided well — the first real caller states the requirement far better than a guess does — and that building it cost a validation surface and four extra tests for no delivered value. | NOTE | trade-off 1 (shipping speed) | `src/core/rng.ts` :: `rollMany` | Clarification review (0b), Sprint 1, Reviewer | `accepted` 2026-08-31 — the owner ruled on the function's shape (S1-R1) having been asked a question that assumed its existence, so it was built. Live cost, not settled. **Revisit at the first real caller**: if the fight engine wants something other than an ordered array, that is evidence the reviewer was right. |
| F-002 | `draws` counts how many random values a fight has consumed, and it is used as the "where are we" marker for replaying a fight. Past about 9 quadrillion draws it stops counting exactly, so it would silently stop being a reliable position. | WARNING | I1 | `src/core/rng.ts` :: `draws` | High-risk review (4), Sprint 1, Codex | `accepted` 2026-08-31 — a fight uses on the order of a hundred draws, so the limit is roughly 90 trillion fights away. A `bigint` counter or a hard ceiling would cost real complexity to defend an unreachable case. **The documentation was corrected** so the comment no longer claims more than the code delivers — that part was not acceptable. |
| F-003 | The guard that stops the simulation core reading the clock or the browser works by searching the source text and by breaking those functions at runtime. Neither method understands the code's structure, so a determined or unlucky spelling could still slip past. **The known residual case:** a clock read written in a deliberately obscured way (`Date["n" + "ow"]()`) *at the top level of a core module* is caught by neither half — the text search sees no literal match, and during module loading only the two random sources are broken, not the clocks. | WARNING | I1 | `tests/no-environment-access.test.ts` :: `FORBIDDEN_PATTERNS`, `trapRandomSources` | High-risk review (4), Sprint 1, Codex + Reviewer | `accepted` 2026-08-31 — Codex recommended replacing the text scan with AST-aware enforcement (a check that parses the code rather than reading it as text). Deferred: it means adding an ESLint toolchain, a real cost against shipping speed for a core of one file. The two halves were strengthened instead — paren-less matching, a wider pattern list, an import check, positive controls, and traps installed before module load. The clocks cannot be trapped during the loading phase because breaking them while the test runner is awaiting an import destabilises the runner itself. **The residual window is now named in the guard's own header comment** rather than papered over. **Revisit when `src/core/` reaches roughly five files**, at which point the toolchain pays for itself. |
| F-004 | The guard lists core files by their full Windows path but compares that list against short paths written with forward slashes. The two sort differently, so the check will fail for no real reason the first time the core gains a subfolder whose name starts like a neighbouring file. | NOTE | test integrity | `tests/no-environment-access.test.ts` :: `collectCoreSources`, `scans exactly the core files that are on disk` | High-risk review (4) round 2, Sprint 1, Reviewer | `accepted` 2026-08-31 — owner ruling S1-R2 scoped the final fix round to the real hole and its documentation. Harmless while `src/core/` is flat, which it is. **Revisit the moment `src/core/` gains a subdirectory** — the fix is to normalise to repo-relative forward-slash paths before sorting, at both comparison sites. |
| F-005 | Four documents say the simulation core may not import from the user-interface code, and imply a tool checks it. Nothing does, for the spelling anyone would actually write. A future core file importing `"../ui/render"` passes the text scan, passes the import check, and loads cleanly. The one UI-import spelling the guard does catch is a form the build could not resolve anyway — so it catches what cannot happen and misses what can. | WARNING | I1 / ADR-001 D3 | `tests/no-environment-access.test.ts` :: `findNonRelativeImports` | Closing review (5), Sprint 1, Reviewer | `open` 2026-08-31 — the fix is one rule, not a pattern list: resolve each specifier against the importing file's directory and flag anything landing outside `src/core/`, plus an `IMPORT_CASES` row proving it on the relative spelling. Not done in Sprint 1 because owner ruling S1-R2 scoped the last round. **ADR-001 carries a dated amendment** saying this half of its constraint is convention-enforced, so the guard's green tick is not misread as proof. Routed to `ROADMAP.md`. |
| F-007 | The doc gate checked links against the working tree on this machine, not against what a fresh clone actually contains. Git cannot store an empty directory, so a link to one works here and is broken everywhere else. `INDEX.md` linked the empty `failures/` category, the gate was green locally, and CI went red on the first push. | WARNING | test integrity | `tools/check-docs.mjs` :: `checkLocalLinks` | Sprint 1, first CI run on `a2a53a0` | `fixed` 2026-08-31 — a `.gitkeep` keeps the category present, and `checkLocalLinks` now flags any link to an empty directory with the reason. **The class matters more than the instance:** a local gate that passes where CI fails teaches people to distrust the local gate, and the next such divergence would be met with a shrug. Checking emptiness rather than git-tracked status is deliberate — a tracked-paths check would flag every new file as broken at exactly the moment this gate runs, before the commit. |
| F-006 | Vitest's own documentation says `restoreAllMocks()` calls `.mockRestore()` on every spy. In version 4.1.11 it does not — it only runs the property-restore callbacks and leaves each mock's implementation intact. That difference is what turned a described hole in the environment guard into a latent one rather than an open one. | NOTE | test integrity | `tests/no-environment-access.test.ts` :: `rearmRandomSources`, `disarmTraps` | High-risk review (4) round 2, Sprint 1, Test & QA Agent | `accepted` 2026-08-31 — nothing in the repository now depends on the behaviour either way, because the guard holds its spies rather than restoring them between phases. Recorded because **if Vitest ever aligns its implementation with its documentation, the old shape's latent hole would open with no diff in this repository** — which is precisely the kind of change nobody would connect to this guard. **Revisit on any Vitest major-version bump.** |

### Column notes

- **ID** — `F-001`, `F-002`, … Sequential, never reused, never renumbered.
- **Meaning in plain language** — what goes wrong and when, in a sentence a product manager
  follows. Not the fix, and not a citation. If this column reads as jargon, the row has failed
  its main job.
- **Grounds** — the vocabulary defined in `docs/AGENTS.md` "Finding format": an invariant `I1`–`I5`, a named convention, `trade-off <n>`, `test integrity`, or `acceptance criterion <n>`.
- **Where** — file plus a **searchable name**.
- **Found** — the gate and sprint, e.g. `Closing review (5), Sprint 3, Codex`.
- **Disposition** — from the table above, with its date and reason.
