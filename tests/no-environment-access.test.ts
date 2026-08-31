/**
 * Guard: `src/core/` must not reach the outside world.
 *
 * ## Why this exists
 *
 * Invariant I1 (determinism) says the same seed plus the same fighters produce
 * exactly the same fight, blow for blow. That only holds if the fight engine
 * computes everything from the seed. The moment any file under `src/core/` reads
 * the clock, calls the browser's built-in random source, or asks the network a
 * question, two people opening the same fight see two different fights — and no
 * test can prove anything about the engine ever again.
 *
 * This file enforces that in three independent ways, because none alone is
 * enough:
 *
 * 1. **A text scan** of every core source file. Cheap, exhaustive over the tree,
 *    and it catches a violation the moment it is typed, before anything has to
 *    run. Because it reads what is written rather than what is called, it also
 *    sees a capture that is never called — `const clock = Date.now;`. What it
 *    does *not* see is a **destructured** capture: `const { random } = Math;`
 *    never spells `Math.random`, and `FORBIDDEN_PATTERNS` deliberately carries no
 *    bare member names, because `random` or `now` on their own would fire on
 *    ordinary code. Check 3 is what covers that spelling.
 * 2. **An import check**: every module `src/core/` imports must be a relative
 *    path. A bare specifier such as `"lodash-es"` is a runtime npm dependency,
 *    which ADR-001 D4 forbids outright.
 * 3. **A runtime trap** that breaks the environment and then loads and runs the
 *    real code. This is the half a text scan cannot do. During the exercise phase
 *    all four sources are trapped, so it catches `Math["ran" + "dom"]()` and every
 *    other spelling a text scan is blind to; and because the two randomness traps
 *    are installed before the first core module evaluates and are never taken off
 *    again, a reference a module captured at load time — including the
 *    destructured `const { random } = Math;` — *is* the armed trap, and throws the
 *    moment it is used. **Residual window:** module evaluation is covered by only
 *    those two traps (see `beforeAll` for why the clocks cannot be trapped across
 *    an `await`), so an obfuscated clock read at module scope such as
 *    `Date["n" + "ow"]()` is invisible to the scan and to the load-phase trap
 *    alike — tracked as finding `F-003` in `docs/operations/finding-register.md`.
 *
 * ## Every check here has a positive control
 *
 * A guard that cannot fail is decoration. A typo in one pattern
 * (`"Math.ranom"`), or a deleted normalisation step, would otherwise leave every
 * test in this file green forever while the guard detected nothing. So the
 * detector functions are run over synthetic strings with known answers — see
 * `detector positive control` below — and the traps are asserted to actually
 * throw before anything is asked to survive them. That last part is checked once
 * per phase, because the two phases arm different traps: the load-phase control
 * sits inside `beforeAll`, immediately before the import loop it protects, and
 * the exercise-phase control is the `exercise phase: all four traps…` test.
 *
 * ## Why this file lives OUTSIDE `src/core/`
 *
 * A guard placed inside the tree it scans finds its *own* search patterns in its
 * own source and fails on itself. Putting it in `tests/` is not tidiness — it is
 * the only place it can work. **Do not move this file into `src/core/`.**
 *
 * Being outside `src/core/` also means this file is free to use `node:` modules
 * and `import.meta`, which the core itself must never do.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { MockInstance } from "vitest";

// Type-only, so it is erased at build time and loads nothing. The runtime trap
// below loads every core module itself, deliberately, from inside the trap.
import type { Rng } from "../src/core/rng";

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TESTS_DIR, "..");
const CORE_DIR = resolve(REPO_ROOT, "src", "core");

/**
 * The forbidden shapes.
 *
 * This is **ADR-001's constraint list** (`Math.random()`, `Date.now()`,
 * `performance.now()`, `crypto.getRandomValues()`, `fetch`, `localStorage`, and
 * no imports from `src/ui/`) **plus the remaining browser and Node globals** that
 * would smuggle the same non-determinism in by another door. If ADR-001's list
 * changes, this list changes with it, and vice versa — they are meant to stay
 * coupled.
 *
 * **Most entries carry no `(`.** A call is not the only way to reach the
 * environment: `const clock = Date.now;` at module scope captures the real
 * function without ever calling it, and the scan sees that only if the pattern
 * stops at the member access rather than requiring a call.
 *
 * The one spelling this list cannot reach is a **destructured** capture,
 * `const { random } = Math;`, which never writes `Math.random` at all. Adding
 * bare member names (`random`, `now`) to catch it would fire on ordinary code, so
 * the runtime trap covers it instead: the load-phase traps are installed before
 * any core module evaluates and stay armed for the whole suite, so the function
 * such a module grabbed *is* the trap, and it throws the moment it is used.
 *
 * Patterns that would otherwise collide with ordinary identifiers keep their `(`
 * — `fetch(` rather than `fetch`, so `refetchLater` does not trip the scan; and
 * `performance.` rather than `performance`, so a fighter's `performanceRating`
 * does not either.
 *
 * **`import.meta` is the one entry no runtime trap can ever cover**, because it
 * is syntax, not a value on an object there is anything to stub. The scan is its
 * sole guard. It matters more than it looks: Vite substitutes
 * `import.meta.env.DEV` at build time, so a core module branching on it computes
 * a *different fight in development than in the deployed build* from the same
 * seed. That is I1 failing in its purest form, and it would never show up in a
 * test run, because tests run on the development side of the branch.
 */
const FORBIDDEN_PATTERNS: readonly string[] = [
  // Non-determinism at the source.
  "Math.random",
  "Date.now",
  "new Date",
  "performance.",
  "crypto",
  "getRandomValues",
  // The host environment.
  "globalThis",
  "window.",
  "document.",
  "navigator.",
  "location.",
  "process.",
  // Storage and I/O: state that outlives a fight, or arrives from elsewhere.
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "fetch(",
  "WebSocket",
  // Build-time and locale-dependent behaviour. `Intl.` and `toLocaleString(`
  // read the host's locale and time zone, so the same core code formats — and
  // can sort — differently on two colleagues' machines.
  "import.meta",
  "Intl.",
  "toLocaleString(",
  // CommonJS: a second, unchecked route to a runtime dependency.
  "require(",
];

/** Source files worth scanning: anything that can carry executable code. */
const SCANNABLE_EXTENSION = /\.(?:[cm]?[jt]s|[jt]sx)$/;

/** Test files legitimately name the things they are testing. */
const TEST_FILE = /\.test\.(?:[cm]?[jt]s|[jt]sx)$/;

/**
 * The core files this guard expects to find, as repo-relative paths.
 *
 * Hand-maintained **on purpose**. Asserting "we found more than zero files"
 * survives four of five core files silently becoming unscannable; asserting the
 * list makes a core file arriving or vanishing a one-line diff a reviewer sees.
 * Adding a module to `src/core/` is meant to cost one line here.
 *
 * The runtime trap below deliberately does *not* read this list — it loads
 * whatever is on disk, so the trap can never fall behind the tree.
 */
const EXPECTED_CORE_SOURCES: readonly string[] = ["src/core/rng.ts"];

/** Every non-test source file under `src/core/`, recursively, sorted. */
function collectCoreSources(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectCoreSources(fullPath));
      continue;
    }
    if (!SCANNABLE_EXTENSION.test(entry.name)) continue;
    if (TEST_FILE.test(entry.name)) continue;
    files.push(fullPath);
  }
  return files.sort();
}

/** A repo-relative path with forward slashes, so failures read alike on any OS. */
function toRepoRelative(fullPath: string): string {
  return relative(REPO_ROOT, fullPath).replace(/\\/g, "/");
}

/**
 * Removes comments.
 *
 * Prose about `Math.random()` — of which the core has plenty, explaining exactly
 * why it is not used — is not a violation.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

/**
 * Strips comments, then normalises spacing around `.` and `(`, so that
 * `Math . random ()` cannot slip past a scan looking for `Math.random`.
 *
 * Known limit: a `//` inside a string literal (a URL, say) truncates that line
 * early, and a pattern hidden by string concatenation is invisible to any text
 * scan. That is precisely the gap the runtime trap below closes.
 */
function normaliseSource(source: string): string {
  return stripComments(source)
    .replace(/\s+/g, " ")
    .replace(/\s*\.\s*/g, ".")
    .replace(/\s*\(/g, "(");
}

/**
 * **The detector.** Returns every forbidden pattern this source reaches for.
 *
 * The real scan and the positive control below both call *this* function, which
 * is the whole point: a control that exercises a copy of the logic proves
 * nothing about the logic that actually runs.
 */
function findEnvironmentAccess(source: string): string[] {
  const normalised = normaliseSource(source);
  return FORBIDDEN_PATTERNS.filter((pattern) => normalised.includes(pattern));
}

/**
 * Every module specifier a source file imports — static, re-export, and dynamic.
 *
 * Deliberately loose: it also matches a `from "…"` that happens to sit inside a
 * template literal. A guard erring toward too many findings is safe; one erring
 * toward too few is exactly what this file exists to prevent.
 */
const SPECIFIER_PATTERNS: readonly RegExp[] = [
  /\bfrom\s*["']([^"']+)["']/g, // import … from "x" / export … from "x"
  /\bimport\s+["']([^"']+)["']/g, // import "x"  (side effect)
  /\bimport\s*\(\s*["']([^"']+)["']/g, // import("x")  (dynamic)
];

function collectImportSpecifiers(source: string): string[] {
  const stripped = stripComments(source);
  const specifiers: string[] = [];
  for (const pattern of SPECIFIER_PATTERNS) {
    for (const match of stripped.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier !== undefined) specifiers.push(specifier);
    }
  }
  return specifiers;
}

/**
 * **The second detector.** Returns every import specifier that is not relative.
 *
 * A relative specifier (`./rng`, `../shared/dice`) resolves to a file in this
 * repository, which the scan above has already read. Anything else — `"zod"`,
 * `"node:fs"`, `"src/ui/render"` — is code nobody here has checked, and a bare
 * npm package name is a runtime dependency ADR-001 D4 forbids.
 */
function findNonRelativeImports(source: string): string[] {
  return collectImportSpecifiers(source).filter(
    (specifier) => !specifier.startsWith("./") && !specifier.startsWith("../"),
  );
}

/* -------------------------------------------------------------------------- */

describe("detector positive control: the guard can actually detect (I4)", () => {
  /**
   * These run the real `findEnvironmentAccess` over synthetic strings rather
   * than over files, so they pin the *detector* instead of today's contents of
   * `src/core/`. Without them, a typo in one pattern or a deleted normalisation
   * step leaves the scan below green forever while it catches nothing — the
   * failure mode this whole file is supposed to be immune to.
   */
  const DETECTION_CASES: ReadonlyArray<
    [label: string, source: string, expected: readonly string[]]
  > = [
    ["a plain call", "const t = Date.now();", ["Date.now"]],
    ["spacing between the parts", "const x = Math . random ();", ["Math.random"]],
    // A **pinned known limit**, not an oversight. The second line is a capture
    // with no call, which the scan does see. The first line is a *destructured*
    // capture, which never spells `Math.random`, so the scan cannot see it and
    // `Math.random` is deliberately absent from the expected list — if someone
    // widens the patterns later, this case fails and makes them say so. The
    // load-phase trap in the runtime block below is what covers that spelling.
    [
      "a capture with no call, while missing the destructured spelling by design",
      "const { random } = Math;\nconst clock = Date.now;",
      ["Date.now"],
    ],
    ["a line break mid-access", "const x = Math\n  .random();", ["Math.random"]],
    [
      "build-time branching no trap can see",
      "if (import.meta.env.DEV) { rounds = 1; }",
      ["import.meta"],
    ],
    ["a locale read", "const s = score.toLocaleString();", ["toLocaleString("]],
    ["a CommonJS require", 'const fs = require("node:fs");', ["require("]],
    ["a reach for the global object", "const g = globalThis;", ["globalThis"]],
    [
      "a destructured crypto helper",
      "const { getRandomValues } = crypto;",
      ["crypto", "getRandomValues"],
    ],
    // The negatives matter as much: a detector that flags everything is as
    // useless as one that flags nothing, because it gets switched off.
    ["nothing in a block comment about the forbidden thing", "/* prose about Math.random() */", []],
    ["nothing in a line comment about the forbidden thing", "// never call Date.now() here", []],
    [
      "nothing in ordinary identifiers that merely look alarming",
      "const refetchLater = 1; const candidate = update(); const performanceRating = 2;",
      [],
    ],
    [
      "nothing in the arithmetic the core really does use",
      "const t = Math.imul(a, b) + Math.floor(c);",
      [],
    ],
  ];

  it.each(DETECTION_CASES)("detects %s", (_label, source, expected) => {
    expect(findEnvironmentAccess(source).sort()).toEqual([...expected].sort());
  });

  const IMPORT_CASES: ReadonlyArray<
    [label: string, source: string, expected: readonly string[]]
  > = [
    ["a relative import", 'import { createRng } from "./rng";', []],
    ["a parent-relative re-export", 'export { dice } from "../shared/dice";', []],
    ["a relative side-effect import", 'import "./register";', []],
    ["a bare npm dependency", 'import { z } from "zod";', ["zod"]],
    ["a node built-in", 'import { readFileSync } from "node:fs";', ["node:fs"]],
    ["a dynamic bare import", 'const m = await import("lodash-es");', ["lodash-es"]],
    [
      "a root-absolute reach into the UI",
      'import { render } from "src/ui/render";',
      ["src/ui/render"],
    ],
    ["nothing in a commented-out dependency", '// import { z } from "zod";', []],
  ];

  it.each(IMPORT_CASES)("flags %s", (_label, source, expected) => {
    expect(findNonRelativeImports(source).sort()).toEqual([...expected].sort());
  });
});

describe("src/core/ text scan: no environment access anywhere in the core (I1)", () => {
  const coreSources = collectCoreSources(CORE_DIR);
  const relativeCoreSources = coreSources.map(toRepoRelative);

  it("scans exactly the core files that are on disk", () => {
    // A scan that silently matches nothing passes forever and guards nothing,
    // and "more than zero" survives four of five files disappearing. The list
    // is asserted, so a core file arriving or vanishing is a visible diff.
    expect(relativeCoreSources).toEqual([...EXPECTED_CORE_SOURCES]);
  });

  it("finds no forbidden call into the environment", () => {
    const violations: string[] = [];

    for (const filePath of coreSources) {
      const source = readFileSync(filePath, "utf8");
      for (const pattern of findEnvironmentAccess(source)) {
        violations.push(`${toRepoRelative(filePath)} uses "${pattern}"`);
      }
    }

    // Reported as a list so one run names every offence rather than the first.
    expect(violations).toEqual([]);
  });

  it("imports nothing but relative paths, so the core carries no runtime dependency", () => {
    // ADR-001 D4: `src/core/` ships with zero runtime npm dependencies. Nothing
    // else in the repository checks this, and one `import { z } from "zod"`
    // would put a third party's code inside the deterministic path.
    const violations: string[] = [];

    for (const filePath of coreSources) {
      const source = readFileSync(filePath, "utf8");
      for (const specifier of findNonRelativeImports(source)) {
        violations.push(`${toRepoRelative(filePath)} imports "${specifier}"`);
      }
    }

    expect(violations).toEqual([]);
  });
});

describe("runtime trap: the core still works with the environment broken (I1)", () => {
  type CreateRng = (seed: number) => Rng;

  const coreSources = collectCoreSources(CORE_DIR);
  const RNG_MODULE = "src/core/rng.ts";

  /** Every core module, as loaded *while the environment was broken*. */
  const loadedCoreModules = new Map<string, Record<string, unknown>>();

  /**
   * **The two randomness traps, held for the lifetime of this suite.**
   *
   * Keeping the spy *objects* — not just the fact that a spy was once installed —
   * is what makes the load-phase trap mean anything. A core module that captures
   * a random source at module scope (`const { random } = Math;`) captures the spy
   * itself; nothing is called, so nothing throws during evaluation, and the module
   * loads happily holding that reference. Restore the spy and install a fresh one
   * for the exercise phase, and the module is left holding an **orphan** — an
   * object no longer attached to `Math`, whose behaviour is now Vitest's business
   * rather than ours. `spy.mockRestore()` clears the mock implementation, and the
   * mock body then falls through to the original, so the orphan becomes a live
   * `Math.random`: the module goes on drawing real randomness while every test in
   * this block stays green, because the tests are asserting against the *fresh*
   * spy. (Today `vi.restoreAllMocks()` happens to leave the orphan's refusal in
   * place, so the hole is latent rather than open — but resting a determinism
   * guard on which teardown call Vitest's internals route through is not a
   * guarantee.)
   *
   * So these two are installed once in `beforeAll`, *re-armed* rather than
   * replaced before each test, and only torn down in `afterAll`. Nothing is ever
   * orphaned, and what a module captured at load time is what the exercise phase
   * re-arms.
   */
  let mathRandomTrap: MockInstance<typeof Math.random> | undefined;
  let getRandomValuesTrap:
    | MockInstance<typeof globalThis.crypto.getRandomValues>
    | undefined;

  /** The clock traps, which exist only for the duration of a single test. */
  let dateNowTrap: MockInstance<typeof Date.now> | undefined;
  let performanceNowTrap:
    | MockInstance<typeof globalThis.performance.now>
    | undefined;

  /**
   * Replaces a source of non-determinism with something that throws. If core
   * code reaches for one — however it spells the access — the call blows up and
   * the test fails, which is the loud outcome we want.
   */
  function refuse(name: string): () => never {
    return () => {
      throw new Error(
        `PAUfighter test: src/core/ must never call ${name} — invariant I1.`,
      );
    };
  }

  /** Installs the two randomness traps. Called once, from `beforeAll`. */
  function trapRandomSources(): void {
    mathRandomTrap = vi
      .spyOn(Math, "random")
      .mockImplementation(refuse("Math.random()"));
    getRandomValuesTrap = vi
      .spyOn(globalThis.crypto, "getRandomValues")
      .mockImplementation(refuse("crypto.getRandomValues()"));
  }

  /**
   * Points the *same* spy objects back at a throwing implementation.
   *
   * Deliberately not `vi.spyOn(...)` again: a second `spyOn` after a restore
   * would hand out new objects and orphan whatever the loaded modules captured.
   */
  function rearmRandomSources(): void {
    if (mathRandomTrap === undefined || getRandomValuesTrap === undefined) {
      throw new Error(
        "PAUfighter test: the load-phase randomness traps were never installed.",
      );
    }
    mathRandomTrap.mockImplementation(refuse("Math.random()"));
    getRandomValuesTrap.mockImplementation(refuse("crypto.getRandomValues()"));
  }

  function trapClocks(): void {
    dateNowTrap = vi.spyOn(Date, "now").mockImplementation(refuse("Date.now()"));
    performanceNowTrap = vi
      .spyOn(globalThis.performance, "now")
      .mockImplementation(refuse("performance.now()"));
  }

  /**
   * Hands the real environment back **without detaching any trap.**
   *
   * `mockReset()` on a `spyOn` mock leaves the spy in place on the object and
   * lets calls fall through to the original function, which is exactly what a
   * "now run it untrapped" comparison needs. `vi.restoreAllMocks()` would instead
   * pull the randomness spies off the objects entirely, orphaning whatever the
   * loaded modules captured and leaving anything added after this test running
   * over a live environment — the shape of hole this block is structured to
   * avoid. Re-arming is then a `beforeEach` away.
   */
  function disarmTraps(): void {
    mathRandomTrap?.mockReset();
    getRandomValuesTrap?.mockReset();
    dateNowTrap?.mockReset();
    performanceNowTrap?.mockReset();
  }

  /**
   * **Load every core module with the environment already broken.**
   *
   * This must happen in `beforeAll`, not `beforeEach`. ES module evaluation
   * happens before any `beforeEach` runs, so a stub installed there arrives too
   * late to see module-scope code: a core module doing
   * `const seedBase = Math.random();` at the top level would have finished
   * running before the trap existed. `vi.resetModules()` plus a dynamic
   * `import()` *inside* the trapped region is what closes that window.
   *
   * The modules are discovered from disk rather than typed out, so the trap
   * covers whatever `src/core/` actually contains. A hand-written list of entry
   * points goes stale the first time someone adds a module and forgets, and the
   * suite then keeps announcing coverage it no longer has.
   *
   * **Why only two traps during the import phase.** `await` hands control back
   * to the runtime, and the test runner uses `Date.now()` and
   * `performance.now()` for its own timing and reporting. Stubbing those to
   * throw across an `await` risks taking the runner down with it, which loses
   * the guard entirely — a worse outcome than the one being guarded against. So
   * the import phase traps only the two randomness sources, which nothing in the
   * runner's hot path touches, and the clocks are added for the exercise phase
   * below, where nothing is awaited.
   *
   * **Why nothing is restored here.** The two randomness traps stay installed for
   * the rest of the suite — see `mathRandomTrap` above. Restoring them between
   * the two phases would turn every module-scope capture back into a live random
   * source while leaving every test green, which is the exact silent pass this
   * block exists to prevent.
   */
  beforeAll(async () => {
    trapRandomSources();

    // **Positive control for the load phase.** Everything below this line trusts
    // that the two traps are genuinely bound before the first module evaluates.
    // If they are not — someone moves `vi.resetModules()` above
    // `trapRandomSources()`, or a runtime makes `Math.random` non-configurable
    // and the spy silently no-ops — every core module would load against a live
    // environment, "loaded every core module on disk with the environment broken"
    // would still pass, and the suite would keep announcing coverage it no longer
    // has. The exercise-phase control cannot stand in for this one: it runs later,
    // against traps re-armed after the imports are already done.
    expect(() => Math.random()).toThrow(/must never call Math\.random/);
    expect(() => globalThis.crypto.getRandomValues(new Uint8Array(1))).toThrow(
      /must never call crypto\.getRandomValues/,
    );

    vi.resetModules();
    for (const filePath of coreSources) {
      const loaded = (await import(
        /* @vite-ignore */ pathToFileURL(filePath).href
      )) as Record<string, unknown>;
      loadedCoreModules.set(toRepoRelative(filePath), loaded);
    }
  });

  /** The full four-way trap, for the exercise phase. */
  beforeEach(() => {
    rearmRandomSources();
    trapClocks();
  });

  afterEach(() => {
    // Only the clocks come off: the runner needs a real `Date.now()` and
    // `performance.now()` for its own timing and reporting between tests. The two
    // randomness traps stay armed until `afterAll`.
    dateNowTrap?.mockRestore();
    performanceNowTrap?.mockRestore();
    dateNowTrap = undefined;
    performanceNowTrap = undefined;
  });

  afterAll(() => {
    mathRandomTrap?.mockRestore();
    getRandomValuesTrap?.mockRestore();
    mathRandomTrap = undefined;
    getRandomValuesTrap = undefined;
  });

  /** The trapped-load `createRng`, or a loud failure saying why there isn't one. */
  function trappedCreateRng(): CreateRng {
    const loaded = loadedCoreModules.get(RNG_MODULE);
    if (loaded === undefined) {
      throw new Error(`PAUfighter test: ${RNG_MODULE} was never loaded.`);
    }
    const factory = loaded.createRng;
    if (typeof factory !== "function") {
      throw new Error(`PAUfighter test: ${RNG_MODULE} exports no createRng.`);
    }
    return factory as CreateRng;
  }

  it("exercise phase: all four traps really do throw, so a passing run means something", () => {
    // The load phase has its own control, inside `beforeAll` — the two cover
    // different moments and different trap objects, so neither substitutes for
    // the other. Without this one, a stub that silently failed to install would
    // leave every other test in this block green and meaningless. All four are
    // asserted rather than skipped-if-absent: a runtime missing one of these
    // globals shrinks the trap, and a trap that shrinks silently is exactly the
    // failure I4 exists to stop.
    expect(() => Math.random()).toThrow(/must never call Math\.random/);
    expect(() => Date.now()).toThrow(/must never call Date\.now/);
    expect(() => globalThis.performance.now()).toThrow(
      /must never call performance\.now/,
    );
    expect(() => globalThis.crypto.getRandomValues(new Uint8Array(1))).toThrow(
      /must never call crypto\.getRandomValues/,
    );
  });

  it("loaded every core module on disk with the environment broken", () => {
    // Loading a module is itself a test: module-scope environment access throws
    // during evaluation, so a module that reaches this map is a module that
    // survived. The set is compared against disk rather than a list, so trap
    // coverage can never quietly shrink to "the one module someone remembered".
    expect(loadedCoreModules.size).toBeGreaterThan(0);
    expect([...loadedCoreModules.keys()].sort()).toEqual(
      coreSources.map(toRepoRelative),
    );
  });

  it("createRng, next, roll and rollMany all complete normally", () => {
    const createRng = trappedCreateRng();
    const rng = createRng(42);

    const fraction = rng.next();
    const die = rng.roll(6);
    const handful = rng.rollMany(3, 20);

    expect(fraction).toBeGreaterThanOrEqual(0);
    expect(fraction).toBeLessThan(1);
    expect(die).toBeGreaterThanOrEqual(1);
    expect(die).toBeLessThanOrEqual(6);
    expect(handful).toHaveLength(3);
    expect(rng.draws).toBe(5);
  });

  it("produces exactly the same stream with the environment broken as without", () => {
    // Completing without throwing is not quite enough: the output must also be
    // unchanged. A generator that quietly fell back to a different code path
    // when the clock was missing would still be non-deterministic.
    const createRng = trappedCreateRng();
    const trapped = createRng(42);
    const withTraps = Array.from({ length: 10 }, () => trapped.roll(20));

    disarmTraps();
    const untrapped = createRng(42);
    const withoutTraps = Array.from({ length: 10 }, () => untrapped.roll(20));

    expect(withTraps).toEqual(withoutTraps);
  });
});
