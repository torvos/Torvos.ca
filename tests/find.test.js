const { describe, test, run, assert, assertEqual, makeFile, makeDir } = require("./harness");

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
    // Files live in a subdirectory, not cwd directly - see the note at
    // the bottom of this file about why that matters here.
    makeDir("d");
    makeFile("d/one.txt", "");
    makeFile("d/two.txt", "");
    makeFile("d/three.md", "");
    const r = await run('find d -name "*.txt"');
    assertEqual(matchedFiles(r.stdout).length, 2);
});

test("? wildcard still works", async () => {
    makeDir("d");
    makeFile("d/file1.txt", "");
    makeFile("d/file22.txt", "");
    const r = await run('find d -name "file?.txt"');
    const matches = matchedFiles(r.stdout);
    assertEqual(matches.length, 1);
    assert(matches[0].endsWith("file1.txt"));
});

// NOTE: these two tests deliberately put their files in a subdirectory
// ("d") rather than directly in cwd. Quoting a glob pattern in this
// shell does NOT currently protect it from the shell's OWN wildcard
// expansion (parseCommand strips quotes before expandWildcards runs, so
// by the time an argument is checked for "*"/"?" it's indistinguishable
// from having been unquoted) - so `find . -name "*.txt"` run directly in
// a directory that already contains matching .txt files gets its -name
// argument silently expanded into a list of real paths by the shell
// itself, before find.js ever sees it. Keeping the matching files out of
// cwd sidesteps that (the shell's own expansion then matches nothing and
// leaves the pattern alone), so these tests still correctly exercise
// find's OWN glob-to-regex matching. The underlying quoting gap is a
// separate, real bug worth fixing on its own.
