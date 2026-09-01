# [ADR-003] What binds a human contributor, and what does not

| Field | Value |
|---|---|
| **ID** | ADR-003 |
| **Status** | accepted |
| **Sprint** | Sprint 2 |
| **Date** | 2026-08-31 |
| **Ruled by** | owner (ruling S2-R1) |
| **Invariants** | all five — this record says who they bind |

## Context

PAUfighter was set up for one owner and one orchestrating agent. The whole governance model
assumed that: agents have declared file scopes, reviewers are advisory, and every substantive
change goes through a nine-step loop with two review gates.

The owner then said the project would have **multiple human collaborators**. That breaks an
assumption the model never stated, because nothing in it describes a contributor who is neither
the owner nor an agent. Left unanswered, each governance document would have had to guess, and
they would have guessed differently — which is exactly what happened in the first draft of the
Sprint 2 roadmap, where four files ended up agreeing on a permission narrower than the process
they prescribed.

The question put to the owner: **does a colleague fixing a typo run clarification, dual review and
the sprint loop?**

## Decisions

- **D1 — The five invariants bind every contributor.** `src/core/` may not touch the clock or the
  network in a colleague's pull request any more than in an agent's. The golden sequence is the
  algorithm's contract regardless of who changes it.
- **D2 — CI binds every contributor.** All four gates run on `pull_request` and on every push, and
  they do not know or care who pushed. This is what makes D1 more than an aspiration.
- **D3 — The conventions in `docs/CONVENTIONS.md` §4 bind contributor code too**, and **no gate
  checks them**. Everything bundled locally, no tracking, the core never imports from `src/ui/`,
  the core carries no runtime dependencies, English throughout. A deviation needs a written reason
  in the pull request, as it would in any other record.
- **D4 — The sprint loop is the Orchestrator's process, not a contributor's obligation.** Steps
  (0) clarify, (0b) dual review, (1) decide, (2) plan, (3) dispatch, (4) high-risk review and
  (5) closing review govern agent-driven sprints. A contributor works on a branch and opens a pull
  request.
- **D5 — The owner remains the single decision-maker.** Contributors propose; rulings and ADRs are
  the owner's. This ADR creates a contributor path, not a second authority.
- **D6 — The contributor-writable surface is named, once, in `ROADMAP.md`'s governance line.**
  Every other file points at it rather than restating it.

## Alternatives considered

- **The full workflow for everyone.** Consistent, and unbearable for a two-line change. A colleague
  with a spare hour will not run a nine-step loop with four review passes, so the rule would be
  ignored — and an ignored rule erodes the ones that matter. Rejected by the owner.
- **Decide later, keep the roadmap neutral.** Tempting, and it was on the table. Rejected because
  the roadmap could not be written neutrally: whether "it lands" means a merged pull request or a
  closed sprint decides how the whole pickup section reads.

## Consequences

**What this buys us.** A colleague can contribute in an afternoon without learning the governance
model, while the things that actually protect the product — the invariants and the gates that
enforce them — apply to their work identically. The enforcement layer becomes the thing that makes
collaboration safe rather than the thing that makes it slow.

**What we gave up, and why.** Contributor changes get **no clarification step and no dual-lens
review**. The gates catch what the gates catch: types, tests, the build, doc consistency. They do
not catch a wrong idea implemented well, which is precisely what step (0b) exists for and is the
defect class this project has found most often. Accepted deliberately — the alternative was a
process nobody would follow — but it means **a contributor's pull request deserves a human read
before it merges**, and that read is the only thing standing where two review gates stand for
agent work.

Second cost: **D3's conventions are enforced by nothing.** The core/UI import rule is `F-005`,
open. A pull request adding a web font or an npm dependency to the core goes green on all four
gates while breaking a written rule. Registered rather than hidden.

**What this constrains going forward.** Any new rule that binds contributors must be either
mechanically enforced or written where a contributor will actually see it — which in practice
means `ROADMAP.md`'s "how to pick something up" section, since that is the one governance document
addressed to them. A rule that exists only in `docs/WORKFLOW.md` binds the Orchestrator alone.

## Revisit when

Contributor pull requests become frequent enough that human review is the bottleneck, or a
contributor breaks a §4 convention that no gate caught. Either is evidence that D3's honesty is
not enough and the conventions need mechanical enforcement.
