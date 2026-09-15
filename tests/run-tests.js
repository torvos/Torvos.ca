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

// test.html can't auto-discover test files the way this Node runner does
// (a browser has no directory listing) - it loads a hardcoded <script>
// per file instead, so it's easy to add a new *.test.js here and forget
// to also wire it into test.html, silently leaving it never run in a
// real browser. Catch that here, as part of the normal Node run, rather
// than relying on remembering to check test.html by hand every time.
function checkTestHtmlIsInSync() {
    const testHtmlPath = path.join(testDir, "..", "test.html");
    const html = fs.readFileSync(testHtmlPath, "utf8");
    const referenced = new Set(
        Array.from(html.matchAll(/tests\/([a-zA-Z0-9_-]+\.test\.js)/g), (m) => m[1])
    );

    const missing = testFiles.filter((f) => !referenced.has(f));
    // The reverse case too - a <script> tag left pointing at a file that
    // was since renamed/deleted (404s harmlessly in the browser, but is
    // just as much drift worth flagging).
    const stale = [...referenced].filter((f) => !testFiles.includes(f)).sort();

    if (missing.length || stale.length) {
        console.log("test.html is out of sync with tests/*.test.js:");
        for (const f of missing) console.log(`  missing from test.html: ${f}`);
        for (const f of stale) console.log(`  test.html references a file that no longer exists: ${f}`);
        console.log("");
        return false;
    }
    return true;
}

for (const file of testFiles) {
    require(path.join(testDir, file));
}

const { runAll } = require("./harness");

runAll().then((testsOk) => {
    const htmlOk = checkTestHtmlIsInSync();
    process.exit(testsOk && htmlOk ? 0 : 1);
});
