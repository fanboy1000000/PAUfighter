/**
 * Tests for the seeded dice roller.
 *
 * The job of this file is to try to *break* `rng.ts`, not to confirm it. Two
 * invariants are on the line:
 *
 * - **I1 (determinism).** Same seed in, same fight out — on any machine, forever.
 * - **I4 (no silent failures).** A bad argument stops the simulation loudly and
 *   says what was wrong, instead of producing `NaN` dice and naming a winner.
 */

import { createRng } from "./rng";
import type { Rng } from "./rng";

/**
 * ---------------------------------------------------------------------------
 * # The golden sequences
 *
 * **These arrays are the algorithm's contract, not a snapshot of current
 * behaviour.** Changing any of them is an ADR-level decision, not a refactor.
 * Every seed anyone has ever written on a sticky note is a promise that these
 * exact numbers come back; swap the underlying recipe and that promise breaks
 * silently — the whole suite would stay green while every recorded seed quietly
 * meant a different fight. If a change makes one of these tests fail, the change
 * is wrong until an ADR says otherwise.
 *
 * The values are exact IEEE-754 doubles that round-trip through source text,
 * which is why these are strict equality checks and not `toBeCloseTo`. They were
 * produced by running the real module, never by hand arithmetic.
 *
 * Three seeds are pinned rather than one, because the two ends of the range are
 * where a mistake in setting up the starting state would actually live:
 *
 * - **42** — an ordinary seed in the middle of the range.
 * - **0** — the starting state is the additive identity, so an off-by-one in
 *   initialisation shows here and almost nowhere else.
 * - **4294967295** — the top of the unsigned 32-bit range, the last value before
 *   the generator's first wrap-around.
 *
 * Both ends do appear inside the fairness pool below, but there a defect at one
 * seed is diluted by four healthy ones. Pinned here, it is a single red line.
 * ---------------------------------------------------------------------------
 */
const GOLDEN_SEED_42 = [
  0.6011037519201636,
  0.44829055899754167,
  0.8524657934904099,
  0.6697340414393693,
  0.17481389874592423,
  0.5265925421845168,
  0.2732279943302274,
  0.6247446539346129,
  0.8654746483080089,
  0.4723170551005751,
];

/** The first four `next()` values of `createRng(0)`. See the heading above. */
const GOLDEN_SEED_ZERO = [
  0.26642920868471265,
  0.0003297457005828619,
  0.2232720274478197,
  0.1462021479383111,
];

/** The first four `next()` values of `createRng(4294967295)`. See above. */
const GOLDEN_SEED_MAX = [
  0.8964226141106337,
  0.189478256739676,
  0.7156526781618595,
  0.9440599093213677,
];

/** Draws `count` raw fractions in order. */
function drawSequence(seed: number, count: number): number[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => rng.next());
}

/** Tallies how often each face came up. */
function tallyFaces(faces: readonly number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const face of faces) {
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  return counts;
}

/**
 * Asserts that a rejected call left the stream exactly where it was.
 *
 * Validation happens before the draw, and that ordering is load-bearing. If a
 * rejected roll consumed a value, one caught-and-ignored error would silently
 * shift every fight event that came after it — the same seed would then produce
 * two different fights depending on whether a bad call had been made along the
 * way. So this is folded into *every* rejection table below rather than being
 * spot-checked on one representative bad value per call path: it is the
 * boundary cases and the wrong-type cases that are most likely to take an
 * unusual route through the guard.
 */
function expectStreamUnmoved(makeBadCall: (rng: Rng) => void): void {
  // A reference generator is walked to the same position, then read ahead, so
  // we know exactly which value *should* come next.
  const reference = createRng(42);
  const subject = createRng(42);
  reference.roll(6);
  subject.roll(6);
  const valueThatShouldComeNext = reference.roll(6);

  const drawsBefore = subject.draws;
  expect(() => makeBadCall(subject)).toThrow(RangeError);
  expect(subject.draws).toBe(drawsBefore);
  expect(subject.roll(6)).toBe(valueThatShouldComeNext);
  expect(subject.draws).toBe(drawsBefore + 1);
}

describe("createRng — determinism (I1)", () => {
  it("reproduces the pinned golden sequence for seed 42", () => {
    // See the golden-sequence heading above: changing these is an ADR decision.
    expect(drawSequence(42, GOLDEN_SEED_42.length)).toEqual(GOLDEN_SEED_42);
  });

  it("reproduces the pinned golden sequence for seed 0", () => {
    expect(drawSequence(0, GOLDEN_SEED_ZERO.length)).toEqual(GOLDEN_SEED_ZERO);
  });

  it("reproduces the pinned golden sequence for seed 4294967295", () => {
    expect(drawSequence(4294967295, GOLDEN_SEED_MAX.length)).toEqual(
      GOLDEN_SEED_MAX,
    );
  });

  it("gives two generators built from the same seed identical streams over 1000 calls", () => {
    expect(drawSequence(42, 1000)).toEqual(drawSequence(42, 1000));
  });

  /**
   * Neighbouring seeds must not be near-duplicates of each other, or "pick a new
   * seed" would not reliably produce a new fight.
   *
   * The assertion is **every** position, not "at least one". A generator that
   * matched in 99 of 100 positions is a classic badly-mixed-generator weakness,
   * and it is precisely what this test exists to rule out — an "at least one
   * differs" check waves it straight through. Verified empirically before being
   * written this way: across every adjacent pair of seeds from 0 to 1999, the
   * worst case is still all 100 positions differing, so there is no margin being
   * spent here. The seeds are fixed, so this cannot flake.
   */
  const ADJACENT_PAIRS: ReadonlyArray<[lower: number, upper: number]> = [
    [0, 1],
    [42, 43],
    [4294967294, 4294967295],
  ];

  it.each(ADJACENT_PAIRS)(
    "gives seeds %i and %i completely different streams",
    (lower, upper) => {
      const fromLower = drawSequence(lower, 100);
      const fromUpper = drawSequence(upper, 100);

      const differingPositions = fromLower.filter(
        (value, index) => value !== fromUpper[index],
      ).length;

      expect(differingPositions).toBe(100);
    },
  );

  it("counts every value drawn, and only values drawn", () => {
    // `draws` is the generator's position in the fight. Replay depends on it
    // being an exact count, so it is pinned at three points.
    const rng = createRng(42);
    expect(rng.draws).toBe(0);

    for (let i = 0; i < 5; i += 1) {
      rng.roll(6);
    }
    expect(rng.draws).toBe(5);

    rng.rollMany(3, 6);
    expect(rng.draws).toBe(8);
  });

  it("exposes the seed it was built from, and cannot be rewritten from outside", () => {
    // Determinism you can quietly overwrite is not determinism: if `roll` or
    // `seed` could be replaced on a live generator, a fight could be steered
    // after the fact and its seed would still claim to explain it.
    const rng = createRng(1337);
    expect(rng.seed).toBe(1337);
    expect(Object.isFrozen(rng)).toBe(true);

    // `Object.isFrozen` alone is not enough to carry the heading's claim.
    // `Object.freeze` is shallow, so the day `Rng` gains a nested object member
    // `isFrozen` still returns `true` while that member is freely mutable. The
    // only assertion that stays honest is attempting the rewrite. Modules run in
    // strict mode, so a refused write throws rather than failing silently.
    expect(() => {
      (rng as { seed: number }).seed = 99;
    }).toThrow(TypeError);
    expect(() => {
      (rng as { roll: unknown }).roll = () => 6;
    }).toThrow(TypeError);

    expect(rng.seed).toBe(1337);
    expect(rng.roll(6)).toBeGreaterThanOrEqual(1);
  });
});

describe("createRng — the negative-zero boundary (I1)", () => {
  /**
   * `-0` is a real, distinct JavaScript number that prints as `0`, compares
   * equal to `0` with `===`, and is a perfectly legal whole number in range — so
   * it sails through validation. Left alone it would make `seed` a value that
   * *looks* like the seed a colleague typed but is not identical to it, and any
   * later `Object.is`, `Map` key, or JSON round-trip could tell the difference.
   * A seed that is not exactly the number it claims to be is a seed that cannot
   * be a reliable key to a fight.
   */
  it("canonicalises -0 to 0 in the reported seed", () => {
    expect(createRng(-0).seed).toBe(0);
    expect(Object.is(createRng(-0).seed, -0)).toBe(false);
    expect(Object.is(createRng(-0).seed, 0)).toBe(true);
  });

  it("gives -0 and 0 the same stream", () => {
    expect(drawSequence(-0, 10)).toEqual(drawSequence(0, 10));
  });
});

/**
 * ---------------------------------------------------------------------------
 * The two tests below are **die-fairness tests. They are NOT I3.**
 *
 * I3 ("no hidden favouritism") is about a *fighter's* chances not depending on
 * which corner it stands in, when it was created, or what it is called. It is
 * verified by swapping two fighters across the same seeds and checking the
 * distribution mirrors exactly. A fair die *underpins* I3 but does not establish
 * it — a perfectly fair die can still feed a lopsided fight engine.
 *
 * I3 is not testable at all until two fighters exist, which is not yet the case.
 * Nothing here should be recorded as I3 coverage for Sprint 1.
 * ---------------------------------------------------------------------------
 */
describe("roll — die fairness (NOT I3)", () => {
  /**
   * Named so that any later change to the sample shows up in a diff rather than
   * being buried in a loop. A "lucky" seed set is the easy way to make a biased
   * die look fair, so the seeds are fixed, public, and boring.
   */
  const FAIRNESS_SEEDS = [0, 42, 1337, 20260831, 4294967295];
  const DRAWS_PER_SEED = 100_000;

  /**
   * How far a face may sit from one sixth.
   *
   * **This band is set by measured behaviour, not by flake tolerance.** The
   * usual reason to leave a wide margin on a statistical test is that it might
   * flake; this one cannot, because the seeds are fixed and the generator is
   * deterministic, so the number it computes is a constant. The measured
   * worst-face deviation is 0.00078 (about 1.5 standard deviations of sampling
   * noise at 500,000 rolls). The band is 0.002 — roughly 3.8 standard
   * deviations, and about 2.5× the real worst case: enough headroom that an
   * innocuous change to the die maths does not trip it, tight enough that a
   * genuinely lopsided die does. The old 0.005 was about 9.5 standard
   * deviations, which bought no safety a deterministic test could use and would
   * have waved through a die six times more skewed than the real one.
   */
  const FAIRNESS_BAND = 0.002;

  it("keeps every d6 face within 0.002 of one sixth across 500,000 pooled rolls", () => {
    // Pooled across five seeds so no single stream can carry the result.
    const counts = new Map<number, number>();
    for (const seed of FAIRNESS_SEEDS) {
      const rng = createRng(seed);
      for (let i = 0; i < DRAWS_PER_SEED; i += 1) {
        const face = rng.roll(6);
        counts.set(face, (counts.get(face) ?? 0) + 1);
      }
    }

    const total = FAIRNESS_SEEDS.length * DRAWS_PER_SEED;
    const deviations = new Map<number, number>();
    for (let face = 1; face <= 6; face += 1) {
      const proportion = (counts.get(face) ?? 0) / total;
      deviations.set(face, Math.abs(proportion - 1 / 6));
    }

    // Reported as one object so a failure names every face at once.
    const offenders = [...deviations].filter(
      ([, deviation]) => deviation > FAIRNESS_BAND,
    );
    expect(offenders).toEqual([]);
    // No face may be missing entirely, which a proportion check alone allows
    // only if some other face absorbs the mass — belt and braces.
    expect([...counts.keys()].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("keeps d20 inside its face range and reaches every face", () => {
    const rng = createRng(42);
    const results = Array.from({ length: 10_000 }, () => rng.roll(20));

    const outOfRange = results.filter(
      (value) => !Number.isInteger(value) || value < 1 || value > 20,
    );
    expect(outOfRange).toEqual([]);

    const seen = tallyFaces(results);
    const missing: number[] = [];
    for (let face = 1; face <= 20; face += 1) {
      if (!seen.has(face)) missing.push(face);
    }
    expect(missing).toEqual([]);
  });
});

/** The message every rejected seed must produce, up to the offending value. */
const SEED_MESSAGE = "PAUfighter rng: seed must be a whole number from 0 to 4294967295, but received";

/** The message every rejected die must produce, up to the offending value. */
const SIDES_MESSAGE = "PAUfighter rng: sides must be a whole number from 1 to 1000, but received";

/** The message every rejected batch size must produce, up to the value. */
const COUNT_MESSAGE = "PAUfighter rng: count must be a whole number from 0 to 1000, but received";

describe("createRng — rejects bad seeds loudly (I4)", () => {
  // An error that does not say *what* was wrong is only half of I4: the point is
  // that a person reading the failure can fix it without opening the source.
  const BAD_SEEDS: ReadonlyArray<[label: string, seed: number, shown: string]> = [
    ["NaN", Number.NaN, "NaN"],
    ["Infinity", Number.POSITIVE_INFINITY, "Infinity"],
    ["-Infinity", Number.NEGATIVE_INFINITY, "-Infinity"],
    ["-1", -1, "-1"],
    ["0.5", 0.5, "0.5"],
    ["2 ** 32", 2 ** 32, "4294967296"],
    ["Number.MAX_SAFE_INTEGER", Number.MAX_SAFE_INTEGER, "9007199254740991"],
  ];

  it.each(BAD_SEEDS)("throws RangeError naming the value for %s", (_label, seed, shown) => {
    expect(() => createRng(seed)).toThrow(RangeError);
    // The whole message is pinned: it must name the argument at fault *and* the
    // value that was actually passed.
    expect(() => createRng(seed)).toThrow(`${SEED_MESSAGE} ${shown}.`);
  });

  it("accepts both ends of the legal seed range", () => {
    expect(createRng(0).seed).toBe(0);
    expect(createRng(4294967295).seed).toBe(4294967295);
  });
});

describe("roll — rejects bad dice loudly (I4)", () => {
  const BAD_SIDES: ReadonlyArray<[label: string, sides: number, shown: string]> = [
    ["0", 0, "0"],
    ["-1", -1, "-1"],
    ["1.5", 1.5, "1.5"],
    ["NaN", Number.NaN, "NaN"],
    ["Infinity", Number.POSITIVE_INFINITY, "Infinity"],
    ["1001", 1001, "1001"],
  ];

  it.each(BAD_SIDES)(
    "throws RangeError naming the value for sides %s, and leaves the stream where it was",
    (_label, sides, shown) => {
      const rng = createRng(42);
      expect(() => rng.roll(sides)).toThrow(RangeError);
      expect(() => rng.roll(sides)).toThrow(`${SIDES_MESSAGE} ${shown}.`);
      expectStreamUnmoved((subject) => subject.roll(sides));
    },
  );

  it("accepts both ends of the legal die range", () => {
    // A one-sided die is degenerate but legal, and must return its only face
    // rather than 0 — an off-by-one here would poison every derived roll.
    expect(createRng(42).roll(1)).toBe(1);

    const largest = createRng(42).roll(1000);
    expect(Number.isInteger(largest)).toBe(true);
    expect(largest).toBeGreaterThanOrEqual(1);
    expect(largest).toBeLessThanOrEqual(1000);
  });
});

describe("rollMany — rejects bad batches loudly (I4)", () => {
  const BAD_COUNTS: ReadonlyArray<[label: string, count: number, shown: string]> = [
    ["1.5", 1.5, "1.5"],
    ["-1", -1, "-1"],
    ["1001", 1001, "1001"],
    ["NaN", Number.NaN, "NaN"],
    ["Infinity", Number.POSITIVE_INFINITY, "Infinity"],
  ];

  it.each(BAD_COUNTS)(
    "throws RangeError naming the value for count %s, and leaves the stream where it was",
    (_label, count, shown) => {
      const rng = createRng(42);
      expect(() => rng.rollMany(count, 6)).toThrow(RangeError);
      expect(() => rng.rollMany(count, 6)).toThrow(`${COUNT_MESSAGE} ${shown}.`);
      expectStreamUnmoved((subject) => subject.rollMany(count, 6));
    },
  );

  // Every `sides` value `roll` rejects must also be rejected when it arrives
  // through `rollMany`. Checking it only on `roll` would leave the batch path
  // free to accept a nonsense die, which is exactly the kind of gap that only
  // shows up in production.
  const BAD_SIDES: ReadonlyArray<[label: string, sides: number, shown: string]> = [
    ["0", 0, "0"],
    ["-1", -1, "-1"],
    ["1.5", 1.5, "1.5"],
    ["NaN", Number.NaN, "NaN"],
    ["Infinity", Number.POSITIVE_INFINITY, "Infinity"],
    ["1001", 1001, "1001"],
  ];

  it.each(BAD_SIDES)(
    "rejects sides %s when passed through rollMany, and leaves the stream where it was",
    (_label, sides, shown) => {
      const rng = createRng(42);
      expect(() => rng.rollMany(3, sides)).toThrow(RangeError);
      expect(() => rng.rollMany(3, sides)).toThrow(`${SIDES_MESSAGE} ${shown}.`);
      expectStreamUnmoved((subject) => subject.rollMany(3, sides));
    },
  );

  it.each(BAD_SIDES)(
    "rejects sides %s even when count is zero, and leaves the stream where it was",
    (_label, sides) => {
      // An empty batch must not become a loophole that lets a nonsense die pass
      // unreported just because no dice were actually rolled.
      const rng = createRng(42);
      expect(() => rng.rollMany(0, sides)).toThrow(RangeError);
      expectStreamUnmoved((subject) => subject.rollMany(0, sides));
    },
  );
});

/**
 * ---------------------------------------------------------------------------
 * # The untyped boundary
 *
 * TypeScript types vanish at build time. The UI will hand this module a number
 * it got from a parsed form field, a URL fragment, or `JSON.parse` — every one
 * of which can produce a string, `null`, or `undefined` while the type
 * annotation still cheerfully says `number`. That boundary is the whole reason
 * `requireIntegerInRange` starts with a `typeof value !== "number"` check and
 * the whole reason `describeValue` has six branches instead of a `String()`
 * call. Neither is reachable from typed code, so neither is covered by any test
 * that passes a real number.
 *
 * A concrete regression this table catches: a future tidy-up replacing
 * `value.toString()` with template interpolation looks harmless, and throws a
 * `TypeError` from inside the error formatter the moment a symbol arrives — so
 * the caller gets the wrong error type from the exact code path that exists to
 * give them the right one.
 * ---------------------------------------------------------------------------
 */
describe("the untyped boundary — rejects non-numbers loudly (I4)", () => {
  const UNTYPED_VALUES: ReadonlyArray<[label: string, value: unknown, shown: string]> = [
    ["a numeric string", "42", '"42"'],
    ["an empty string", "", '""'],
    ["null", null, "null"],
    ["undefined", undefined, "undefined"],
    ["an object", {}, "an object"],
    ["an array", [], "an array"],
    ["a bigint", 10n, "10n"],
    ["a symbol", Symbol("s"), "Symbol(s)"],
    ["a function", () => 1, "a function"],
  ];

  it.each(UNTYPED_VALUES)(
    "rejects %s at every entry point, naming it in the message",
    (_label, value, shown) => {
      // The cast is the point of the test, not a workaround. TypeScript would
      // reject every one of these at author time; what is being defended here is
      // the JavaScript boundary underneath, where the annotation is gone and the
      // value arrives as whatever the caller actually had.
      const untyped = value as number;
      const rng = createRng(42);

      expect(() => createRng(untyped)).toThrow(RangeError);
      expect(() => createRng(untyped)).toThrow(`${SEED_MESSAGE} ${shown}.`);

      expect(() => rng.roll(untyped)).toThrow(RangeError);
      expect(() => rng.roll(untyped)).toThrow(`${SIDES_MESSAGE} ${shown}.`);

      expect(() => rng.rollMany(untyped, 6)).toThrow(RangeError);
      expect(() => rng.rollMany(untyped, 6)).toThrow(`${COUNT_MESSAGE} ${shown}.`);

      expect(() => rng.rollMany(3, untyped)).toThrow(RangeError);
      expect(() => rng.rollMany(3, untyped)).toThrow(`${SIDES_MESSAGE} ${shown}.`);

      // A wrong-typed argument must not move the stream either — the type check
      // and the range check are one guard, and it runs before any draw.
      expectStreamUnmoved((subject) => subject.roll(untyped));
      expectStreamUnmoved((subject) => subject.rollMany(untyped, 6));
      expectStreamUnmoved((subject) => subject.rollMany(3, untyped));
    },
  );
});

describe("rollMany — batch behaviour", () => {
  it("returns an empty array for zero dice and consumes nothing", () => {
    const rng = createRng(42);
    expect(rng.rollMany(0, 6)).toEqual([]);
    expect(rng.draws).toBe(0);
  });

  it("accepts the largest legal batch", () => {
    // Pins the accepted boundary so an off-by-one that rejects exactly 1000
    // fails here rather than in a fight.
    const rng = createRng(42);
    const dice = rng.rollMany(1000, 6);
    expect(dice).toHaveLength(1000);
    expect(rng.draws).toBe(1000);
  });

  it("is exactly the same as rolling one die at a time from the same position", () => {
    // The batch helper must be a convenience, never a second source of chance.
    const batched = createRng(42).rollMany(3, 6);
    expect(batched).toHaveLength(3);
    expect(batched.filter((face) => !Number.isInteger(face) || face < 1 || face > 6)).toEqual([]);

    const oneAtATime = createRng(42);
    expect(batched).toEqual([oneAtATime.roll(6), oneAtATime.roll(6), oneAtATime.roll(6)]);
  });
});
