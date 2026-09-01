# PAUfighter — Roadmap

> **What this is:** the project's living **forward view** — a loose arc of where the game is going,
> a **backlog** of things someone can pick up, and a **parking lot** for ideas. Deliberately
> low-fidelity: jot things here so they are not lost, and flesh them out when someone claims them.
>
> **What this is NOT.** Each of these has a maintained home; do not duplicate them here.
>
> | Not this | Its home |
> |---|---|
> | What actually shipped | [docs/sprints/INDEX.md](docs/sprints/INDEX.md) |
> | Decisions, and what they cost | [docs/knowledge-base/](docs/knowledge-base/INDEX.md) |
> | Known defects and their dispositions | [docs/operations/finding-register.md](docs/operations/finding-register.md) |
> | The process itself | [docs/WORKFLOW.md](docs/WORKFLOW.md) |
>
> **Governance — who may edit what.** The Orchestrator owns the arc, the item set, and the minting
> of ids. **A contributor may, by pull request:** put their handle in the `Claimed by` cell of an
> unclaimed row; write the `Done when` cell of the row they are claiming; and **remove that row in
> the same pull request that lands the work.** Those three edits are the contributor-writable
> surface, defined here and pointed at from everywhere else — see
> [ADR-003](docs/knowledge-base/decisions/ADR-003-what-binds-a-contributor.md).
>
> **How it stays alive (the forcing function).** At each sprint close,
> [docs/WORKFLOW.md](docs/WORKFLOW.md) step (7) item 3 routes every deferred follow-up **that has
> work someone could do** into the Backlog below. The rest stay in the finding register and are
> re-read at every close — see *Which register rows appear here*. Items leave the Backlog when the
> work lands. Nothing is lost by being merely mentioned in a conversation.

---

## 1. The arc

Direction, not commitments. No dates: this is a volunteer project, and a date here would become
either fiction or pressure.

### `now` — a fight that can be trusted

Get a seeded, deterministic fight running end to end, with the invariants provable rather than
asserted. Ugly is fine. Wrong is not.

- ✅ Seeded dice, injected into the core (Sprint 1)
- Fighters with stats, and a fight that resolves round by round
- A structured event log that explains the outcome (I5)
- Invariant tests: monotonicity (I2) and corner symmetry (I3), which need two fighters to exist

### `next` — something a colleague can open

A simulator nobody watches is a test suite with ambitions.

- A minimal UI: build two fighters, run the fight, watch the log
- Share the seed, so two people can watch the same fight
- ✅ Deployed to GitHub Pages from CI (Sprint 1)

### `later` — something worth watching twice

Only once the above is solid, and strictly in trade-off order: depth before polish, polish before
breadth.

- Simulation depth: fighting styles, stamina, accumulating damage, knockouts, judges
- Presentation: round-by-round playback rather than a wall of text
- Breadth: saved fighters, tournaments, a leaderboard

---

## 2. Backlog — things you can pick up

### How to pick something up

1. **Choose an unclaimed item.** Anything with `—` in `Claimed by`. A row marked
   **Not yet worth doing** is deferred on purpose — read why before starting it.
2. **If `Done when` is `—`, write it first.** That is the claimant's job, not the router's, and it
   is one of the three edits the governance line grants you.
3. **Claim it:** open a pull request putting your **GitHub handle and today's date** in
   `Claimed by`, together with the `Done when` you just wrote.
4. **Start when the claim merges**, not when the pull request opens.
5. **Work on a branch and open a pull request.** CI runs the same four gates on your push as on
   anyone else's, and **all of [docs/CONVENTIONS.md](docs/CONVENTIONS.md) binds your code** — the
   five invariants *and* the §4 conventions (everything bundled locally, no tracking, the core
   never imports from `src/ui/`, the core carries no runtime dependencies, English throughout).
   **No gate checks §4**, so a deliberate deviation needs a written reason in the pull request.
   [ADR-003](docs/knowledge-base/decisions/ADR-003-what-binds-a-contributor.md) states exactly what
   binds you and what does not.
6. **Remove the row in the pull request that lands the work.** What shipped is recorded in
   [docs/sprints/INDEX.md](docs/sprints/INDEX.md) and the register, not here.

> **Claiming is advisory coordination. It does not prevent collisions.** Two people can open
> competing claim pull requests and git will not necessarily conflict on them. The column tells
> you what someone *intends* to work on; it is not a lock. If you see a competing claim, talk to
> each other.
>
> **A claim more than a month old is fair game.** A stale `Claimed by` is worse than no column at
> all, because it tells the next person an item is taken when it is not.

### Guards and enforcement

| ID | Item | Claimed by | Done when |
|---|---|---|---|
| `F-005` | *(deferred S1)* The rule that the simulation core may not import from the user interface is enforced by nothing. | — | As stated in `F-005`'s disposition in [the register](docs/operations/finding-register.md). |
| `B-001` → `F-008` | *(deferred S1)* Reviewers are told not to write files rather than being unable to. | — | As stated in `F-008`'s disposition. |
| `F-003` | **Not yet worth doing** — *(deferred S1)* the environment guard reads source text rather than parsing it, leaving a named residual case. Its disposition defers this until `src/core/` reaches roughly five files; it currently holds two. | — | — |
| `F-004` | **Not yet worth doing** — *(deferred S1)* the core-file scan's path comparison is fragile once `src/core/` stops being flat. Its disposition defers this until that happens; it is flat today. | — | As stated in `F-004`'s disposition. |

### Tooling and verification

| ID | Item | Claimed by | Done when |
|---|---|---|---|
| `B-002` → `F-009` | *(deferred S1)* Nothing has confirmed the dice produce the same numbers in a browser as in Node. The suite runs only in Node, so it cannot make the claim invariant I1 rests on. | — | As stated in `F-009`'s disposition. |
| `B-003` | *(deferred S1)* The doc gate's link checker understands only the simplest kind of Markdown link. **The limit is already stated** in `tools/check-docs.mjs`'s header; what is outstanding is the decision record, not the disclosure. | — | Either `tools/check-docs.mjs` resolves reference-style and angle-bracket links, proven by a control fixture that fails before the change; or an ADR records why a Markdown parser was rejected, and the script's header links it. |

### Reading these tables

- **Ids are permanent.** `F-NNN` ids belong to
  [the finding register](docs/operations/finding-register.md); `B-NNN` ids are minted here for
  items that had no register row when they were routed. **An item keeps the id it was minted
  with for its whole life.** `B-001` and `B-002` earned register rows in Sprint 2 — they are shown
  as `B-001 → F-008` and `B-002 → F-009`, the `B-` id is not retired, and the `F-` row is now
  authoritative. Ids are never reused and never renumbered.
- **A gap in the `B-` sequence means the item left the backlog.** It does not necessarily mean it
  shipped — the ledger and the register say which and why. For a `B-` item that never earned a
  register row, the pull request that removed the row is the only record, so **say why in that
  pull request's description.**
- **Which register rows appear here.** A finding is a backlog item when its disposition is `open`
  or `in-progress`, or when it is `accepted` **and its disposition names a concrete fix**. A row
  whose fix is real but deliberately deferred carries **Not yet worth doing** and its trigger, so
  the deferral is on the table rather than one click away. An `accepted` finding whose disposition
  names **no fix at all** stays in the register only: `F-002`, accepted because the limit is
  unreachable, and `F-006`, where there is nothing to do unless Vitest changes. Neither is
  forgotten — the register is re-read at every sprint close. `fixed`, `wont-fix` and `superseded`
  never appear.
- **Register-backed rows carry a scanning label, not a copy.** The item cell exists so you can
  skim. **The register is authoritative whenever the wording differs** — what goes wrong, when,
  the fix, and why it was deferred are its, and a label here that has drifted is a label to fix,
  not a fact to trust. A `B-` row with no register behind it carries its own text.
- **A `Done when` pointer is only valid when the target names a checkable end state.** `F-003`'s
  disposition records what was done instead, a direction, and a trigger — no completion criterion
  — so its cell is `—` and whoever claims it writes one. A pointer at prose that cannot be
  falsified silently bypasses the rule below.
- **Why `Done when` can start blank.** A follow-up routed at sprint close lands with `Done when: —`
  so routing stays a step rather than becoming a task — otherwise nine follow-ups mean nine
  falsifiable criteria written at the worst possible moment, and the ones that are hard to word
  quietly do not get routed at all. **An item cannot be claimed until its `Done when` is written,
  and writing it is the claimant's first act.**
- **Only two columns beyond the item itself**, deliberately. A `Size` column would be an
  uncalibrated guess with nothing checking it, and the most tracker-shaped thing available. A
  `Needs` column would read `—` on every current row, which teaches people to skip it — and then
  to skip it on the row where it matters. **Add `Needs` when a second genuine dependency appears;
  add `Size` when the backlog is too long to skim.** Adding a column later costs nothing.
- **`(deferred SN)`** in an item cell is the sprint that routed it. It is the backlog's only age
  signal, and it costs no column.
- **Themes are added as the backlog grows.** Two is enough for six items.

---

## 3. Parking lot — loose ideas

Unfiltered. No commitment, no order, no obligation. The cost of a bad idea here is zero; the cost
of a good idea forgotten is not. Ideas graduate to the Backlog when someone gives them a
`Done when`.

- Commentary track that narrates the log as it plays
- Fighter archetypes as presets (brawler, counter-puncher, grappler)
- A "rematch with the same seed" button, to show the fight really is deterministic
- Export a fight as a shareable link containing the seed and both fighters
