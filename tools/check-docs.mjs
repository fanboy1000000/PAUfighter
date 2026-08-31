#!/usr/bin/env node
/**
 * Documentation consistency gate for PAUfighter.
 *
 * Docs rot for one reason: keeping them current is discretionary, so it loses to
 * everything that is not. This script makes the load-bearing consistency checks
 * fail the build instead of relying on someone remembering.
 *
 * Checks (all HARD — exit 1 on failure):
 *   1. KB INDEX completeness — every record on disk has a TABLE ROW in
 *      docs/knowledge-base/INDEX.md, and every record the index links exists.
 *   2. Sprint-log inventory — every SPRINT-N.md on disk has a TABLE ROW in
 *      docs/sprints/INDEX.md, and every sprint named there exists on disk.
 *   3. Local links resolve — every relative **inline** Markdown link in the docs
 *      tree, CLAUDE.md and ROADMAP.md points at a file or directory that exists.
 *      Inline only: `[text](path)` with no whitespace or `)` in the destination.
 *      Reference-style links, angle-bracket destinations and titled destinations
 *      are NOT seen. Every link in the repository today is the simple form, and
 *      widening this means a Markdown parser, which is a dependency. Stated here
 *      rather than left implied, and tracked in ROADMAP.md.
 *   4. Generated-doc drift — any Markdown file under docs/generated/ (at any
 *      depth) carrying a `generated-from` header still matches its source.
 *      Dormant until the first generated document exists.
 *
 * Why checks 1 and 2 require a *table row* rather than a mention: an earlier
 * version searched the whole file for the filename, so a name appearing in prose,
 * a comment, or a "see also" aside satisfied the gate while the accounting table
 * stayed incomplete. The tables are what the governance documents actually promise;
 * the gate now checks the promise rather than a proxy for it.
 *
 * Usage:  node tools/check-docs.mjs   (or: npm run check:docs)
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const KB = join(REPO, "docs", "knowledge-base");
const KB_INDEX = join(KB, "INDEX.md");
const KB_CATEGORIES = ["decisions", "patterns", "failures"];
const SPRINTS = join(REPO, "docs", "sprints");
const SPRINTS_INDEX = join(SPRINTS, "INDEX.md");
const GENERATED = join(REPO, "docs", "generated");

/** @type {string[]} */
const failures = [];
const ok = (msg) => console.log(`[ok] ${msg}`);
const fail = (msg) => failures.push(msg);
const rel = (p) => relative(REPO, p).replace(/\\/g, "/");

const listMd = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")) : [];

/** Every .md under `dir`, at any depth, as absolute paths. */
function listMdDeep(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listMdDeep(full));
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

/**
 * The lines of a Markdown file that are table rows — they start with `|` after
 * optional indentation. Checks 1 and 2 look only here, so a filename mentioned in
 * prose cannot satisfy an accounting requirement.
 */
const tableRows = (text) =>
  text.split(/\r?\n/).filter((line) => /^\s*\|/.test(line));

// ---------------------------------------------------------------- check 1: KB

function checkKbIndex() {
  if (!existsSync(KB_INDEX)) {
    fail("docs/knowledge-base/INDEX.md is missing");
    return;
  }
  const onDisk = new Set(
    KB_CATEGORIES.flatMap((cat) => listMd(join(KB, cat)).map((f) => `${cat}/${f}`)),
  );

  const rows = tableRows(readFileSync(KB_INDEX, "utf8")).join("\n");
  const pattern = new RegExp(`\\]\\((${KB_CATEGORIES.join("|")})/([^)\\s]+\\.md)\\)`, "g");
  const linked = new Set([...rows.matchAll(pattern)].map((m) => `${m[1]}/${m[2]}`));

  const orphans = [...onDisk].filter((f) => !linked.has(f)).sort();
  const dangling = [...linked].filter((f) => !onDisk.has(f)).sort();

  if (orphans.length) {
    fail(
      "Knowledge-base records on disk with no TABLE ROW in INDEX.md (orphans).\n" +
        "    A record nobody can find gets rediscovered the hard way. Add a row for each:\n" +
        orphans.map((f) => `      ${f}`).join("\n"),
    );
  }
  if (dangling.length) {
    fail(
      "INDEX.md has rows linking knowledge-base files that do not exist (dangling):\n" +
        dangling.map((f) => `      ${f}`).join("\n"),
    );
  }
  if (!orphans.length && !dangling.length) {
    ok(`KB INDEX complete (${onDisk.size} record${onDisk.size === 1 ? "" : "s"} in table rows, 0 orphans, 0 dangling)`);
  }
}

// ----------------------------------------------------------- check 2: sprints

function checkSprintInventory() {
  if (!existsSync(SPRINTS_INDEX)) {
    fail("docs/sprints/INDEX.md is missing");
    return;
  }
  const onDisk = new Set(
    listMd(SPRINTS)
      .filter((f) => /^SPRINT-\d+\.md$/.test(f))
      .map((f) => /^SPRINT-(\d+)\.md$/.exec(f)[1]),
  );

  const rows = tableRows(readFileSync(SPRINTS_INDEX, "utf8")).join("\n");
  const named = new Set([...rows.matchAll(/SPRINT-(\d+)\.md/g)].map((m) => m[1]));

  const byNumber = (a, b) => Number(a) - Number(b);
  const unlisted = [...onDisk].filter((n) => !named.has(n)).sort(byNumber);
  const missing = [...named].filter((n) => !onDisk.has(n)).sort(byNumber);

  if (unlisted.length) {
    fail(
      "Sprint logs on disk with no TABLE ROW in docs/sprints/INDEX.md:\n" +
        "    The ledger is the accounting table — a sprint missing from it did not happen,\n" +
        "    as far as anyone reading the record can tell. Add a row for:\n" +
        unlisted.map((n) => `      SPRINT-${n}.md`).join("\n"),
    );
  }
  if (missing.length) {
    fail(
      "docs/sprints/INDEX.md has rows naming sprint logs that do not exist on disk:\n" +
        missing.map((n) => `      SPRINT-${n}.md`).join("\n"),
    );
  }
  if (!unlisted.length && !missing.length) {
    ok(`Sprint ledger complete (${onDisk.size} sprint log${onDisk.size === 1 ? "" : "s"} in table rows, 0 unlisted, 0 missing)`);
  }
}

// -------------------------------------------------------- check 3: local links

/**
 * Every relative INLINE Markdown link in the governed documents must resolve.
 * The two completeness checks above deliberately look only at their own tables,
 * so without this a link anywhere else — a document map row, a cross-reference
 * between records — could rot unnoticed. External links (http, mailto) and pure
 * anchors are not our business.
 *
 * Known limit, stated rather than implied: the pattern matches `[text](path)`
 * where the destination contains no whitespace or `)`. Reference-style links,
 * `<angle-bracket>` destinations and `(path "title")` forms are invisible to it.
 * That covers every link in the repository today; widening it properly means a
 * Markdown parser, and the alternative to saying so here is a header that
 * promises more than the function delivers.
 */
function checkLocalLinks() {
  const docs = [
    ...listMdDeep(join(REPO, "docs")),
    join(REPO, "CLAUDE.md"),
    join(REPO, "ROADMAP.md"),
  ].filter((p) => existsSync(p));

  let checked = 0;
  const broken = [];

  for (const doc of docs) {
    const text = readFileSync(doc, "utf8");
    for (const m of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const target = m[1];
      if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) continue; // external or anchor
      const path = resolve(dirname(doc), target.split("#")[0]);
      checked++;

      if (!existsSync(path)) {
        broken.push(`${rel(doc)} -> ${target}  (does not exist)`);
        continue;
      }

      // A link to an EMPTY directory resolves here and breaks in CI. Git cannot
      // store an empty directory, so it is absent from every clone — the local
      // working tree is the one place on earth where such a link works. This
      // check exists because exactly that shipped a red build on Sprint 1's
      // first push: docs/knowledge-base/failures/ was empty, INDEX.md linked it,
      // and the gate was green locally and red in CI.
      //
      // Checking "is it empty" rather than "is it tracked by git" is deliberate:
      // a tracked-paths check would flag every new file as broken before it is
      // committed, which is precisely when this gate runs.
      if (statSync(path).isDirectory() && readdirSync(path).length === 0) {
        broken.push(
          `${rel(doc)} -> ${target}  (empty directory — git cannot store it, ` +
            "so this link works only on this machine; add a .gitkeep or drop the link)",
        );
      }
    }
  }

  if (broken.length) {
    fail(
      "Local links that do not resolve in a fresh clone:\n" +
        broken.map((b) => `      ${b}`).join("\n"),
    );
  } else {
    ok(`Local links resolve (${checked} checked across ${docs.length} documents)`);
  }
}

// --------------------------------------------------- check 4: generated drift

/**
 * A generated document declares its provenance in an HTML comment near the top:
 *
 *   <!-- generated-from: docker/schema.sql | sha256: a1b2c3... -->
 *
 * The hash is of the SOURCE file's bytes at generation time. If the source has
 * changed since, the document is stale and this fails. Scans docs/generated/ at
 * any depth. Markdown only — if a generated document in another format ever
 * appears, extend this and say so here.
 */
function checkGeneratedDrift() {
  const files = listMdDeep(GENERATED);
  if (!files.length) {
    ok("Generated-doc drift: no generated documents yet — check dormant, wires up automatically");
    return;
  }

  let checked = 0;
  for (const path of files) {
    const name = rel(path);
    const head = readFileSync(path, "utf8").slice(0, 2048);
    const marker = /<!--\s*generated-from:\s*([^|]+?)\s*\|\s*sha256:\s*([0-9a-f]{64})\s*-->/.exec(head);

    if (!marker) {
      fail(
        `${name} has no provenance marker.\n` +
          "    Every generated document must declare its source so drift can be detected:\n" +
          "      <!-- generated-from: <path to source> | sha256: <hash of source> -->",
      );
      continue;
    }

    const [, sourceRel, recordedHash] = marker;
    const sourcePath = join(REPO, sourceRel);
    if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) {
      fail(`${name} is generated from "${sourceRel}", which does not exist.`);
      continue;
    }

    const actualHash = createHash("sha256").update(readFileSync(sourcePath)).digest("hex");
    if (actualHash !== recordedHash) {
      fail(
        `${name} has drifted from its source.\n` +
          `      source:   ${rel(sourcePath)}\n` +
          `      recorded: ${recordedHash.slice(0, 12)}…\n` +
          `      actual:   ${actualHash.slice(0, 12)}…\n` +
          "    Regenerate it, or the docs describe a system that no longer exists.",
      );
      continue;
    }
    checked++;
  }

  if (checked === files.length) {
    ok(`Generated-doc drift: ${checked} document${checked === 1 ? "" : "s"} in sync with source`);
  }
}

// ------------------------------------------------------------------- run them

console.log("Checking documentation consistency…\n");
checkKbIndex();
checkSprintInventory();
checkLocalLinks();
checkGeneratedDrift();

if (failures.length) {
  console.error(`\n${failures.length} doc-consistency failure${failures.length === 1 ? "" : "s"}:\n`);
  for (const f of failures) console.error(`  - ${f}\n`);
  console.error("Run at every sprint close (WORKFLOW.md step 7) and in CI.\n");
  process.exit(1);
}

console.log("\nAll doc-consistency checks passed.");
