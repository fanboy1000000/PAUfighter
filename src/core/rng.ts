/**
 * Seeded dice — the single source of chance in PAUfighter.
 *
 * ## Why this module exists
 *
 * A fight has to be repeatable. If a colleague opens the same fight you opened,
 * they must see the same punches land in the same order. Otherwise a fight cannot
 * be shared, replayed, or debugged, and no test can ever prove the simulation is
 * fair. That is invariant I1 (determinism), and it either holds here or it holds
 * nowhere: every later part of the fight engine takes its randomness from here.
 *
 * A **seed** is just a number a person picks — `42`, `1337`, a date — that decides
 * every dice roll in a fight from the first jab to the final bell. Same seed in,
 * same fight out, on any machine, forever. In effect the seed *is* the fight,
 * compressed into one number you can write on a sticky note and hand to someone.
 *
 * For that to be true, this module reads nothing whatsoever from the outside world:
 * no clock, no built-in random source, no browser or host state. Every number it
 * produces is computed from the seed by plain arithmetic.
 *
 * The generator is also **handed to** the fight engine rather than imported by it
 * as a shared module-level value. One generator per fight, built from that fight's
 * seed. A shared generator is shared mutable state, and shared mutable state is how
 * determinism dies quietly: fight #2 would come out differently depending on
 * whether anyone had watched fight #1 first.
 *
 * ## How it works, briefly
 *
 * The recipe is called **mulberry32** — about eight lines of 32-bit whole-number
 * arithmetic that turn one starting number into an endless stream of fractions that
 * look random. It needs no library, which keeps the core free of dependencies.
 *
 * It reproduces identically on every engine because each step it uses (`Math.imul`,
 * the shift and bitwise operators) is exactly specified by the language standard,
 * and the final division is by an exactly representable power of two. A generator
 * built on ordinary decimal arithmetic could round differently on two machines, and
 * then the same seed would give two colleagues two different fights.
 *
 * ## The one real limitation
 *
 * Mulberry32 *looks* random; it is not *unpredictable*. Someone who sees a short
 * run of its output can work out the internal state and predict everything that
 * follows, and there are only about four billion possible seeds — few enough to try
 * them all on a laptop. That is entirely fine here, where the seed is meant to be
 * shared and the stakes are bragging rights. It would be the wrong tool for
 * anything that must be genuinely unguessable — passwords, tokens, session keys, or
 * a shuffle someone has money on. Do not reuse this module for such a purpose.
 *
 * ## Two deliberate design choices
 *
 * 1. **`roll` consumes exactly one underlying value.** The usual fix for the tiny
 *    lopsidedness of `floor(fraction * sides)` is to throw awkward values away and
 *    redraw. We do not, because a fixed one-roll-one-draw accounting is what makes
 *    `draws` a usable "position in the fight" marker for replay later. At die sizes
 *    up to 1000 the lopsidedness is far below the fairness band the tests use.
 * 2. **Every out-of-domain argument throws immediately, naming the value.** Nothing
 *    is quietly coerced. A silently accepted bad seed yields `NaN` dice and names a
 *    winner anyway — precisely the failure invariant I4 exists to stop.
 */

/** Largest accepted seed: the biggest whole number that fits in 32 bits. */
const MAX_SEED = 4294967295;

/**
 * Largest accepted die. The cap is *not* a limit of the 32-bit source: one draw
 * still reaches every face for any die size up to 2^32. It exists for two other
 * reasons.
 *
 * First, it keeps the lopsidedness of the one-draw-per-roll rule small, and that
 * lopsidedness grows with the number of faces. Each face claims a whole number of
 * the 2^32 possible draw values, and 2^32 rarely divides evenly by the die size, so
 * some faces end up holding one value more than the others. For a d6 the remainder
 * is 4 (2^32 mod 6), so four of the six faces come up about 1 part in 715,827,882
 * more often than the other two. At this 1000-face cap the remainder is 296 and the
 * excess is about 1 part in 4,294,967 — roughly 167 times larger, and still orders
 * of magnitude below the 0.005 fairness band the tests hold rolls to.
 *
 * Second, a bounded domain means a nonsense argument is reported rather than
 * obeyed (I4).
 */
const MAX_SIDES = 1000;

/** Largest accepted handful of dice. Turns a runaway loop into a message. */
const MAX_COUNT = 1000;

/** The divisor that maps a 32-bit whole number onto the range `[0, 1)`. */
const TWO_POW_32 = 4294967296;

/** mulberry32's step constant. */
const STEP = 0x6d2b79f5;

/**
 * A seeded stream of chance. Everything the fight engine leaves to luck comes
 * through one of these, and nothing else.
 */
export interface Rng {
  /** The raw stream: a fraction in `[0, 1)`. Every other member is built on it. */
  next(): number;

  /**
   * One die: an integer in `[1, sides]`. Consumes exactly one `next()` value.
   *
   * @throws {RangeError} if `sides` is not a whole number from 1 to 1000.
   */
  roll(sides: number): number;

  /**
   * `count` dice in the order they were rolled, each in `[1, sides]`. Consumes
   * exactly `count` values. The individual dice are returned rather than their
   * sum, because a fight log has to be able to say *which* dice fell (I5) — and
   * the dice cannot be recovered from a total.
   *
   * @throws {RangeError} if `count` is not a whole number from 0 to 1000, or if
   *   `sides` is not a whole number from 1 to 1000.
   */
  rollMany(count: number, sides: number): number[];

  /** The seed this generator was created from. Read-only. */
  readonly seed: number;

  /**
   * How many values have been drawn from the stream so far; `0` when fresh.
   * Read-only. This is the generator's position, and therefore the position a
   * replay would resume from.
   *
   * The count is exact up to `Number.MAX_SAFE_INTEGER` draws and stops advancing
   * reliably beyond it — a bound no reachable fight approaches, since a fight
   * spends on the order of a hundred draws.
   */
  readonly draws: number;
}

/**
 * Renders any value for an error message, so the message can always name what was
 * actually passed — including when an untyped caller passes something absurd.
 */
function describeValue(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "symbol") return value.toString();
  if (typeof value === "function") return "a function";
  if (typeof value === "object" && value !== null) {
    return Array.isArray(value) ? "an array" : "an object";
  }
  return String(value);
}

/**
 * The single guard behind every domain in this module. Rejects non-numbers,
 * fractions, `NaN`, both infinities, and anything outside `[min, max]` — always
 * loudly, always naming the offending value (I4).
 */
function requireIntegerInRange(
  value: number,
  min: number,
  max: number,
  name: string,
): void {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new RangeError(
      `PAUfighter rng: ${name} must be a whole number from ${min} to ${max}, ` +
        `but received ${describeValue(value)}.`,
    );
  }
}

/**
 * Creates a generator for one fight from one seed.
 *
 * @param seed A whole number from 0 to 4294967295. Two generators made from the
 *   same seed produce identical streams, forever, on any machine.
 * @throws {RangeError} if `seed` is not a whole number in that range. Fractions
 *   are rejected rather than rounded: `createRng(0.5)` and `createRng(0.9)` would
 *   otherwise produce the same fight while faithfully reporting two different
 *   seeds, so the seed would stop being a unique key to a fight.
 */
export function createRng(seed: number): Rng {
  requireIntegerInRange(seed, 0, MAX_SEED, "seed");

  // `-0` and `0` are the same quantity written two ways, and they already produce
  // the same stream — but `Object.is` (and therefore the test suite's `toBe`) treats
  // them as different values. Left alone, `-0` would be a second name for a fight
  // that already has one, which is the very thing the seed domain exists to prevent
  // and the same reason fractions are rejected. So collapse the two spellings here,
  // before the seed is stored or reported.
  const canonicalSeed = Object.is(seed, -0) ? 0 : seed;

  // The generator's whole memory: 32 bits of state, and a count of what has been
  // taken from it. Both live in this closure, so nothing outside can reach in and
  // move the stream without drawing from it.
  let state = canonicalSeed >>> 0;
  let drawCount = 0;

  const next = (): number => {
    state = (state + STEP) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    drawCount += 1;
    return ((t ^ (t >>> 14)) >>> 0) / TWO_POW_32;
  };

  const roll = (sides: number): number => {
    // Validation first, draw second: a rejected roll must not move the stream, or
    // one bad call would silently change every fight event that came after it.
    requireIntegerInRange(sides, 1, MAX_SIDES, "sides");
    return Math.floor(next() * sides) + 1;
  };

  const rollMany = (count: number, sides: number): number[] => {
    // `sides` is checked here as well as inside `roll`, so that `rollMany(0, -1)`
    // is reported rather than quietly returning an empty array from a nonsense die.
    requireIntegerInRange(count, 0, MAX_COUNT, "count");
    requireIntegerInRange(sides, 1, MAX_SIDES, "sides");

    const dice: number[] = [];
    for (let i = 0; i < count; i += 1) {
      dice.push(roll(sides));
    }
    return dice;
  };

  const rng: Rng = {
    next,
    roll,
    rollMany,
    get seed(): number {
      return canonicalSeed;
    },
    get draws(): number {
      return drawCount;
    },
  };

  // Frozen so that `seed`, `draws`, and the roll functions cannot be replaced from
  // outside. Determinism you can quietly overwrite is not determinism.
  return Object.freeze(rng);
}
