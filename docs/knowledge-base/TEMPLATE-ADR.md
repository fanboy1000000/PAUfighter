# [ADR-NNN] <Short title in the imperative: what was decided>

| Field | Value |
|---|---|
| **ID** | ADR-NNN |
| **Status** | proposed \| accepted \| superseded by ADR-NNN |
| **Sprint** | Sprint N |
| **Date** | YYYY-MM-DD |
| **Ruled by** | owner \| orchestrator |
| **Invariants** | which of I1–I5 this decision touches, or "none" |

## Context

What situation forced a decision? What was true before it, what pressure appeared, and what
made "carry on as before" not an option. Written so someone who was not there understands why
this came up at all — the reader six months from now has no memory of the conversation.

State the constraints that narrowed the field: the invariants in play, the ranked trade-offs
that mattered, and any earlier record this builds on.

## Decisions

Numbered, so later documents can cite one precisely — "ADR-004 D2" is a usable reference; "that
ADR about the dice" is not.

- **D1** — the first decision, stated as something that is now true.
- **D2** — the next one.

Each is a single, checkable statement. If a decision cannot be violated by a specific line of
code, it is context, not a decision.

## Alternatives considered

What else was genuinely on the table, and why it lost. An ADR with no rejected alternatives is
either a decision that did not need making, or a decision whose reasoning was not written down.

- **<Alternative>** — what it would have given us, and what it cost. Why it lost.

## Consequences

What is now true, including the parts that are inconvenient.

**What this buys us.** The upside, concretely.

**What we gave up, and why.** The honest cost. This section is mandatory and may not be empty —
a decision with no downside was not a decision. If you cannot name what was given up, you have
not understood the alternatives.

**What this constrains going forward.** What future work may no longer do, and what now has to
happen because of this.

## Revisit when

The condition under which this decision should be reopened — an event, a threshold, a scale.
"Never" is a legitimate answer; leaving it blank is not.
