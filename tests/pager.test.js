const { describe, test, run, assert, assertEqual, makeFile } = require("./harness");

describe("less/more: can be piped into, not just given a direct file argument");

test("less with a direct file argument (regression)", async () => {
    makeFile("a.txt", "hello\nworld\n");
    const r = await run("less a.txt");
    assertEqual(r.stdout, "hello\nworld\n");
});

test("less with no argument and no stdin still errors", async () => {
    const r = await run("less");
    assertEqual(r.exitCode, 1);
});

test("less with piped stdin (short content) now works", async () => {
    const r = await run('echo "piped one" | less');
    assertEqual(r.stdout, "piped one");
});

test("more with piped stdin now works", async () => {
    const r = await run('echo "more piped content" | more');
    assertEqual(r.stdout, "more piped content");
});

test("more with a direct file argument (regression)", async () => {
    makeFile("a.txt", "hello\nworld\n");
    const r = await run("more a.txt");
    assertEqual(r.stdout, "hello\nworld\n");
});

test("a file argument takes priority over stdin if both are present", async () => {
    makeFile("a.txt", "from the file\n");
    const r = await run('echo "from stdin" | less a.txt');
    assertEqual(r.stdout, "from the file\n");
});
