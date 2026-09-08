#!/usr/bin/env node
/**
 * Test runner entry point. Usage: `node tests/run-tests.js`
 *
 * Loads every *.test.js file in this directory (each just registers its
 * tests against the shared harness - see harness.js's file header for
 * how registration vs. execution is split), then runs them all in
 * sequence and prints a pass/fail summary. Exits 0 if everything passed,
 * 1 otherwise, so this can be wired into a pre-commit hook or CI without
 * any extra plumbing.
 *
 * To add a new test file: drop a `something.test.js` file in this
 * directory that does:
 *
 *     const { describe, test, run, assert, assertEqual, assertIncludes,
 *             makeFile, makeDir, terminal, FileSystemAPI } = require("./harness");
 *
 *     describe("my feature");
 *     test("does the thing", async () => {
 *         const r = await run("some-command --flag");
 *         assertEqual(r.exitCode, 0);
 *         assertIncludes(r.stdout, "expected text");
 *     });
 *
 * It'll be picked up automatically next run - nothing else to register.
 * Each test gets a fresh filesystem and fresh terminal.cwd/env/history/
 * aliases automatically (see resetState() in harness.js), so tests don't
 * need to clean up after themselves or worry about ordering.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const testDir = __dirname;
const testFiles = fs
    .readdirSync(testDir)
    .filter((f) => f.endsWith(".test.js"))
    .sort();

for (const file of testFiles) {
    require(path.join(testDir, file));
}

const { runAll } = require("./harness");

runAll().then((ok) => {
    process.exit(ok ? 0 : 1);
});
