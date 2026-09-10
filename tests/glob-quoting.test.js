(function () {
"use strict";

const { describe, test, run, assert, assertEqual, makeFile, terminal, FileSystemAPI } = typeof module !== "undefined" ? require("./harness") : window.TestHarness;

describe("quoting a wildcard pattern protects it from shell-level glob expansion");

test("echo with a quoted glob prints the literal text", async () => {
    makeFile("one.txt", "");
    makeFile("two.txt", "");
    const r = await run('echo "*.txt"');
    assertEqual(r.stdout, "*.txt");
});

test("a quoted glob with a ? character is also protected", async () => {
    makeFile("file1.txt", "");
    const r = await run('echo "file?.txt"');
    assertEqual(r.stdout, "file?.txt");
});

test("an unquoted glob still expands normally against real files", async () => {
    makeFile("one.txt", "");
    makeFile("two.txt", "");
    const r = await run("echo *.txt");
    assertEqual(r.stdout, "/home/guest/one.txt /home/guest/two.txt");
});

test("a backslash-escaped glob character is also literal", async () => {
    makeFile("one.txt", "");
    const r = await run("echo \\*.txt");
    assertEqual(r.stdout, "*.txt");
});

test("single-quoted glob is protected the same as double-quoted", async () => {
    makeFile("one.txt", "");
    const r = await run("echo '*.txt'");
    assertEqual(r.stdout, "*.txt");
});

test("mixing a quoted literal arg and an unquoted glob arg in one command", async () => {
    makeFile("one.txt", "");
    makeFile("two.txt", "");
    const r = await run('echo "*.md" *.txt');
    assertEqual(r.stdout, "*.md /home/guest/one.txt /home/guest/two.txt");
});

test("find -name with a quoted glob now works directly in cwd (no workaround needed)", async () => {
    makeFile("one.txt", "");
    makeFile("two.txt", "");
    makeFile("three.md", "");
    const r = await run('find . -name "*.txt"');
    assertEqual(r.stdout.split("\n").filter(Boolean).length, 2);
});

test("touch with a quoted glob creates a literal filename, not a glob target", async () => {
    await run('touch "star*.txt"');
    assert(!!FileSystemAPI.get("star*.txt", terminal.cwd), "a file literally named star*.txt should exist");
});

test("grep with a quoted pattern containing * matches literally, not as a wildcard", async () => {
    makeFile("f.txt", "a*b\nab\naab\n");
    const r = await run("grep 'a*b' f.txt");
    assertEqual(r.stdout, "a*b");
});

test("a quoted glob that matches no real files stays literal (no expansion-empty warning path)", async () => {
    const r = await run('echo "nomatch*.xyz"');
    assertEqual(r.stdout, "nomatch*.xyz");
});

})();
