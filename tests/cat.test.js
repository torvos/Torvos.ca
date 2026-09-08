const { describe, test, run, assertEqual, makeFile } = require("./harness");

describe("cat: multi-file concatenation and -n numbering");

test("multi-file concatenation doesn't insert an extra blank line", async () => {
    makeFile("a.txt", "line1\n");
    makeFile("b.txt", "line2\n");
    const r = await run("cat a.txt b.txt");
    assertEqual(r.stdout, "line1\nline2\n");
});

test("concatenation when the first file has no trailing newline", async () => {
    makeFile("c.txt", "line1");
    makeFile("d.txt", "line2\n");
    const r = await run("cat c.txt d.txt");
    assertEqual(r.stdout, "line1line2\n");
});

test("-n on a single line ending in a newline doesn't print a phantom line 2", async () => {
    makeFile("e.txt", "line1\n");
    const r = await run("cat -n e.txt");
    assertEqual(r.stdout, "  1  line1\n");
});

test("-n on a multi-line file", async () => {
    makeFile("f.txt", "one\ntwo\nthree\n");
    const r = await run("cat -n f.txt");
    assertEqual(r.stdout, "  1  one\n  2  two\n  3  three\n");
});

test("-n with no trailing newline", async () => {
    makeFile("g.txt", "onlyline");
    const r = await run("cat -n g.txt");
    assertEqual(r.stdout, "  1  onlyline");
});

test("-n numbers continuously across concatenated files", async () => {
    makeFile("a.txt", "line1\n");
    makeFile("b.txt", "line2\n");
    const r = await run("cat -n a.txt b.txt");
    assertEqual(r.stdout, "  1  line1\n  2  line2\n");
});

test("an empty file produces empty output, with or without -n", async () => {
    makeFile("empty.txt", "");
    assertEqual((await run("cat empty.txt")).stdout, "");
    assertEqual((await run("cat -n empty.txt")).stdout, "");
});
