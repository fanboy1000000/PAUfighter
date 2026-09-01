# PAUfighter Conventions

> **This file is injected VERBATIM into every agent prompt**, and it is **required reading for
> human contributors** — who receive nothing verbatim, and so must be pointed here. It binds the
> Orchestrator, every domain agent, and every contributor's code alike; see
> [ADR-003](knowledge-base/decisions/ADR-003-what-binds-a-contributor.md) for exactly what does
> and does not bind a contributor. That is why it is short: it is read on every single task. If it
> grows to several pages, nobody consciously stops reading it; they just stop.

---

## 1. The Invariant Model — how decisions are governed

Work is governed by two sets that are **different in kind**: **invariants**, which are never
traded away, and **trade-offs**, which are balanced against each other.

The difference is not degrees of importance. A trade-off is something we can deliberately give
up to gain something else. An invariant is something we cannot give up without destroying what
the product is.

### Inviolable invariants — CO-EQUAL, not ranked against each other

A solution that compromises **any** invariant is **not a valid path**: reject it and find
another that satisfies all of them. You do not sacrifice one to gain another. When two appear
to conflict, there is almost always a design that honours both. If they are *genuinely,
unavoidably* in conflict (rare), it **escalates to the owner** — never an ad-hoc trade made by
an agent.

**I1 — Determinism.** The same seed + the same fighters + the same actions produce exactly the
same fight, blow for blow. All randomness derives from one explicit seed. No code in the fight
engine calls `Math.random()`, `Date.now()`, `crypto.getRandomValues()`, or reads anything from
the outside world.
*Why:* without this, nothing in the engine can be tested, replayed, or debugged — and a fight
cannot be shared with a colleague who needs to see the same thing.

**I2 — Stats matter, and always in the right direction.** Raising a fighter's stat must never
make its expected outcome worse. (Jargon: *monotonicity* — a curve that only moves one way.)
*Why:* this is the classic bug in simulation maths. It is invisible in any single fight, and it
is fatal to trust in the game.

**I3 — No hidden favouritism.** A fighter's chances depend solely on its stats and the dice —
not on which corner it stands in, when it was created, or what it is called.
*Verified by:* swap the two fighters across the same set of seeds, and the distribution must
mirror exactly.

**I4 — No silent failures.** If the simulation's state becomes invalid — `NaN`, negative
stamina, a round that never ends — it stops **visibly** rather than playing on from a wrong
basis and naming a winner anyway.

**I5 — The fight can be explained.** Every fight produces a structured event log showing *why*
someone won: which rolls, which hits, how much damage, which round. A result without its log
is not a valid result.

### Ranked trade-offs — balanced, NEVER above an invariant

When these conflict with each other, the earlier one usually wins, all else being equal.

1. **Shipping speed** — something playable, fast. We cut scope, never invariants.
2. **Easy sharing** — a colleague opens one link and plays. No install, no account, no
   instructions.
3. **Simulation depth** — the fight should feel credible. It may start simple.
4. **Maintainability** — a tidy core that can be built on.
5. **Visual polish** — animation, sound, drama. Comes late.
6. **Feature breadth** — tournaments, leaderboards, careers. Last, if at all.

### The enforcement layer — not a priority

CI (build, test, doc consistency) is the *machinery* that keeps the invariants true build over
build. It protects the goals; it is not itself one of them, and it is not weighed against them.

---

## 2. Project status and stakes

**PAUfighter is an office gimmick and a learning project.** There are real users — colleagues
in the office — but nothing is at stake beyond fun and honest craft. No personal data, no
money, no decisions about anyone.

What that means in practice:

- **The discipline does not relax.** The invariant model, the dual reviews, the gates, and the
  testable core are exactly what is being exercised here. Hold them to production standards.
- **Findings are framed as craft, not incident risk.** Severity ranks engineering priority, not
  danger to anyone.
  - **Like this:** *"Damage calculation can produce `NaN` when stamina hits zero. This breaks I4
    and names an arbitrary winner."*
  - **Not like this:** *"Critical vulnerability with reputational consequences for users."*
- **The repository is public.** Never write anything in code or documentation you would not put
  your name to in the open: no colleagues' names, no internal Økonomistyrelsen matters, no
  fighters named after real people.

---

## 3. Audience & Explanation Standard

**The owner is a product manager, not the code's author. Every decision must be explained so a
product manager can understand it AND learn from it.** This is a first-class requirement, not a
courtesy — learning is half the reason the project exists.

- **Lead with the why and the plain-language what, before the mechanism.** Name the problem, the
  decision, and the consequence in words a PM follows. Then give file, line, and implementation
  detail for the record.
- **Define jargon on first use** — or avoid it. *Monotonicity*, *seed*, *ADR*, *invariant*,
  *bundling*, *DOM* each get a one-line gloss the first time they appear in an explanation.
- **Make trade-offs visible.** When something is chosen, say what was given up and why. People
  learn from the reasoning, not from the outcome.
- **This applies to governance artifacts too.** Sprint logs, refinements, and the finding
  register carry a readable summary, not just citations. Whoever reads them should come away
  knowing more about the system than before.

---

## 4. Conventions — may be deviated from, with a reason

Unlike the invariants, these may be broken when there is a reason. The reason gets written down.

- **Everything is bundled locally.** No CDNs, no web fonts from foreign domains, no third-party
  scripts. The game must work when a foreign domain is down or blocked by the office network.
  *(This began as an invariant about personal data; the owner deleted that invariant once the
  game had no personal data, but kept the rule as a convention — see ADR-002.)*
- **No tracking.** No analytics, no counters, no accounts. If we ever want one, that is a
  deliberate decision with an ADR — not something that quietly slips in.
- **The core never touches the screen.** `src/core/` never imports from `src/ui/` and never
  touches a browser API. That separation is what makes I1–I5 mechanically verifiable across
  thousands of fights.
- **The core has no dependencies.** `src/core/` has zero runtime npm dependencies.
- **Language:** documentation, code, identifiers, comments, and commit messages are in English.
