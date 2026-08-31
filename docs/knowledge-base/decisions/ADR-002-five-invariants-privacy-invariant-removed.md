# [ADR-002] Five invariants; the data-privacy invariant is removed, its rule kept as a convention

| Field | Value |
|---|---|
| **ID** | ADR-002 |
| **Status** | accepted |
| **Sprint** | Sprint 1 |
| **Date** | 2026-08-31 |
| **Ruled by** | owner |
| **Invariants** | defines all of them |

## Context

The invariant set was established by interviewing the owner. Six candidates were confirmed
initially. The sixth read:

> *Colleagues' names never leave the machine. Fighters will be colleagues — that is the whole
> point. So: no data sent to external services, no analytics, no third-party CDNs. Everything
> stays local.*

Two later answers from the owner contradicted it directly: **fighters will not use real names**,
and **the game must be hosted online** so colleagues can reach it from a browser. The first
removes the personal data the invariant was protecting; the second makes "everything stays
local" false by construction.

Under the invariant model, an invariant in genuine conflict with a requirement is escalated to
the owner rather than quietly traded away. It was escalated. The owner was offered two paths:
reformulate the invariant as "the game collects nothing about whoever plays it", or delete it.

## Decisions

- **D1** — The invariant set is **five, co-equal**: **I1** Determinism · **I2** Stats matter,
  monotonically · **I3** No hidden favouritism · **I4** No silent failures · **I5** The fight can
  be explained. The authoritative wording is in `docs/CONVENTIONS.md` section 1 and is not
  duplicated elsewhere.
- **D2** — The data-privacy invariant is **removed**, not reformulated.
- **D3** — Its operative rules survive as **conventions** in `docs/CONVENTIONS.md` section 4:
  everything is bundled locally (no CDNs, no foreign web fonts, no third-party scripts), and
  there is no tracking (no analytics, no counters, no accounts). Conventions may be deviated
  from with a written reason; invariants may not.
- **D4** — Because the repository is **public**, no colleague's name, no internal
  Økonomistyrelsen matter, and no fighter named after a real person appears in code or
  documentation. This is a convention, not an invariant.

## Alternatives considered

- **Reformulate as "the game collects nothing about whoever plays it."** This was the
  recommendation. It survives hosting, stays mechanically checkable (no `fetch` to foreign
  domains, no analytics in the bundle), and puts a wall in front of the easiest bad decision
  available later — "let us just add a counter so we can see who plays most". The owner
  rejected it with a better argument than the one for it: an invariant should be both something
  you would never break *and* something that is genuinely at stake. With no personal data, the
  second half fails, and an invariant that protects nothing dilutes the five that protect
  something. Five load-bearing invariants beat six where one is decorative.

- **Keep the original wording and drop online hosting.** Never seriously on the table — hosting
  is what makes the thing shareable, which is the second-ranked trade-off.

## Consequences

**What this buys us.** Every remaining invariant is load-bearing and mechanically testable, and
all five concern the same thing: whether the simulation can be trusted. That coherence is worth
more than coverage. It also means a BLOCKER finding always signals something real, which is what
keeps the severity labels meaningful.

**What we gave up, and why.** The removed invariant was the only structural obstacle to adding
tracking later. That obstacle now rests on a convention, which is by definition deviable. The
owner accepted this knowingly; the mitigation is D3's explicit wording, so that adding a counter
requires a deliberate ADR rather than an unremarked commit. The reviewers are expected to flag
any such addition as a convention deviation without a written reason.

**What this constrains going forward.** Reviewers cite I1 through I5 only. Any finding about
tracking, CDNs, or public-repository hygiene is a **convention** finding — a WARNING at most,
never a BLOCKER, unless it also breaks one of the five. Adding analytics, a counter, an account
system, or a third-party script requires a new ADR.

## Revisit when

The game ever stores something a person typed that could identify them — a nickname tied to a
real person, a free-text comment, an uploaded image. At that moment the removed invariant
becomes load-bearing again and should be reinstated rather than patched over with a convention.
