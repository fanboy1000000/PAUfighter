# PAUfighter Knowledge Base — Index

> **Governance:** Orchestrator-only. Agents may propose records (a `PROPOSED RECORD` section in
> their output); only the Orchestrator writes them.
>
> **This index must list every record on disk.** `tools/check-docs.mjs` fails the build on an
> orphan (a file nobody links) or a dangling link (a link to nothing). That gate exists because
> a record nobody can find is a record that gets rediscovered the hard way.

## Categories

| Prefix | Directory | Purpose |
|---|---|---|
| **ADR** | [`decisions/`](decisions/) | Architecture Decision Records — why we chose X over Y, and what we gave up |
| **PAT** | [`patterns/`](patterns/) | Validated patterns — how we do X here, and why that way |
| **FAIL** | [`failures/`](failures/) | What we tried that did not work, and why. The most-skipped and most-valuable category. |

Template: [`TEMPLATE-ADR.md`](TEMPLATE-ADR.md).

## Decisions

| ID | Record | Status | Summary |
|---|---|---|---|
| ADR-001 | [TypeScript + Vite + Vitest, DOM-free core](decisions/ADR-001-typescript-vite-vitest-dom-free-core.md) | accepted | The stack, and the rule that the simulation never touches the screen — which is what makes the invariants testable at all. |
| ADR-002 | [Five invariants; privacy invariant removed](decisions/ADR-002-five-invariants-privacy-invariant-removed.md) | accepted | The invariant set is five, co-equal. The data-privacy candidate was deleted once the game had no personal data; its rules survive as conventions. |
| ADR-003 | [What binds a human contributor](decisions/ADR-003-what-binds-a-contributor.md) | accepted | The invariants, CI and the §4 conventions bind every contributor; the sprint loop is the Orchestrator's process. Names the one cost: contributor changes get no clarification and no dual review, so they need a human read. |

## Patterns

| ID | Record | Status | Summary |
|---|---|---|---|
| PAT-001 | [Injected seeded randomness](patterns/PAT-001-injected-seeded-randomness.md) | accepted | Three rules the core must keep: randomness is injected not imported, validate before you draw, and one roll consumes exactly one value. All three break silently, which is why they are written down. |

## Failures

_None yet._
