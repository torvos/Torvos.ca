(function () {
"use strict";

const { describe, test, run, assertEqual, makeFile } = typeof module !== "undefined" ? require("./harness") : window.TestHarness;

describe("wc: line counting matches real `wc -l` semantics (counts newlines, not split segments)");

test("content with a trailing newline", async () => {
    makeFile("f.txt", "a\nb\nc\n");
    const r = await run("wc -l f.txt");
    assertEqual(parseInt(r.stdout, 10), 3);
});

test("content with no trailing newline", async () => {
    makeFile("f.txt", "a\nb\nc");
    const r = await run("wc -l f.txt");
    assertEqual(parseInt(r.stdout, 10), 2);
});

test("no newline at all", async () => {
    makeFile("f.txt", "hello");
    const r = await run("wc -l f.txt");
    assertEqual(parseInt(r.stdout, 10), 0);
});

test("a single newline only", async () => {
    makeFile("f.txt", "\n");
    const r = await run("wc -l f.txt");
    assertEqual(parseInt(r.stdout, 10), 1);
});

test("word and byte counts are unaffected by the line-count fix", async () => {
    makeFile("f.txt", "the quick brown fox\n");
    const words = await run("wc -w f.txt");
    assertEqual(parseInt(words.stdout, 10), 4);
    const bytes = await run("wc -c f.txt");
    assertEqual(parseInt(bytes.stdout, 10), 20);
});

test("multi-file total line is the sum of each file's count", async () => {
    makeFile("a.txt", "one\ntwo\n");
    makeFile("b.txt", "three\n");
    const r = await run("wc -l a.txt b.txt");
    assertEqual(r.stdout, "2 a.txt\n1 b.txt\n3 total");
});

})();
