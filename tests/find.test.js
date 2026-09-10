(function () {
"use strict";

const { describe, test, run, assert, assertEqual, makeFile } = typeof module !== "undefined" ? require("./harness") : window.TestHarness;

function matchedFiles(stdout) {
    return stdout.split("\n").filter(Boolean);
}

describe("find -name: glob patterns with regex-special characters match literally");

test("parentheses in a filename match only that literal name", async () => {
    makeFile("file(1).txt", "");
    makeFile("file1.txt", "");
    const r = await run('find . -name "file(1).txt"');
    const matches = matchedFiles(r.stdout);
    assertEqual(matches.length, 1);
    assert(matches[0].endsWith("file(1).txt"));
});

test("a literal '+' doesn't act as a regex quantifier", async () => {
    makeFile("a+b.txt", "");
    makeFile("aab.txt", "");
    const r = await run('find . -name "a+b.txt"');
    const matches = matchedFiles(r.stdout);
    assertEqual(matches.length, 1);
    assert(matches[0].endsWith("a+b.txt"), "must not also match aab.txt");
});

test("an unbalanced bracket in a pattern doesn't crash - it's treated as literal", async () => {
    const r = await run('find . -name "file[abc.txt"');
    assertEqual(r.exitCode, 0);
    assertEqual(r.stdout, "");
});

test("* wildcard still works", async () => {
    makeFile("one.txt", "");
    makeFile("two.txt", "");
    makeFile("three.md", "");
    const r = await run('find . -name "*.txt"');
    assertEqual(matchedFiles(r.stdout).length, 2);
});

test("? wildcard still works", async () => {
    makeFile("file1.txt", "");
    makeFile("file22.txt", "");
    const r = await run('find . -name "file?.txt"');
    const matches = matchedFiles(r.stdout);
    assertEqual(matches.length, 1);
    assert(matches[0].endsWith("file1.txt"));
});

})();
