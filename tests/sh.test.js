(function () {
"use strict";

const { describe, test, run, assert, assertEqual, assertIncludes, makeFile, makeDir, terminal, FileSystemAPI } = typeof module !== "undefined" ? require("./harness") : window.TestHarness;

describe("sh: script output is live when standalone, captured when piped/redirected");

test("a standalone script's output is returned normally", async () => {
    makeFile("live.sh", "echo first\necho second\necho third\n", { executable: true });
    const r = await run("sh live.sh");
    assertEqual(r.stdout, "first\nsecond\nthird");
});

test("piping a script's output into another command now works", async () => {
    makeFile("failscript.sh", "echo this line should match fail keyword\nfalse\n", { executable: true });
    const r = await run("sh failscript.sh | grep fail");
    assertIncludes(r.stdout, "fail");
});

test("piping into grep with no match correctly finds nothing", async () => {
    makeFile("failscript.sh", "echo this line should match fail keyword\nfalse\n", { executable: true });
    const r = await run("sh failscript.sh | grep nomatch_xyz");
    assertEqual(r.stdout, "");
    assertEqual(r.exitCode, 1);
});

test("redirecting a script's output to a file works", async () => {
    makeFile("redir.sh", "echo redirected content\n", { executable: true });
    await run("sh redir.sh > out.txt");
    const content = FileSystemAPI.readContent(FileSystemAPI.get("out.txt", terminal.cwd));
    assertEqual(content.trim(), "redirected content");
});

test("a nested script call inherits the outer script's capture mode when piped", async () => {
    makeFile("inner.sh", "echo inner output with fail marker\n", { executable: true });
    makeFile("outer.sh", "echo outer line one\nsh inner.sh\necho outer line two\n", { executable: true });
    const r = await run("sh outer.sh | grep fail");
    assertIncludes(r.stdout, "fail marker");
});

test("a nested script call stays live when the outer script is standalone", async () => {
    makeFile("inner.sh", "echo inner output\n", { executable: true });
    makeFile("outer.sh", "echo outer line one\nsh inner.sh\necho outer line two\n", { executable: true });
    const r = await run("sh outer.sh");
    assertEqual(r.stdout, "outer line one\ninner output\nouter line two");
});

test("control flow (for loop) works standalone", async () => {
    makeFile("loop.sh", "for i in 1 2 3; do\n  echo num $i\ndone\n", { executable: true });
    const r = await run("sh loop.sh");
    assertEqual(r.stdout, "num 1\nnum 2\nnum 3");
});

test("control flow (for loop) works piped", async () => {
    makeFile("loop.sh", "for i in 1 2 3; do\n  echo num $i\ndone\n", { executable: true });
    const r = await run("sh loop.sh | grep 2");
    assertEqual(r.stdout.trim(), "num 2");
});

test("$(sh script.sh) command substitution captures the script's output", async () => {
    makeFile("sub.sh", "echo captured via substitution\n", { executable: true });
    const r = await run('echo "result: $(sh sub.sh)"');
    assertIncludes(r.stdout, "captured via substitution");
});

test("./script.sh path-style invocation supports piping too", async () => {
    makeFile("path.sh", "echo path-style output with fail marker\n", { executable: true });
    const r = await run("./path.sh | grep fail");
    assertIncludes(r.stdout, "fail marker");
});

test("running sh on a directory fails with exit code 126", async () => {
    makeDir("adir");
    const r = await run("sh adir");
    assertEqual(r.exitCode, 126);
});

test("running sh on a nonexistent script fails with exit code 127", async () => {
    const r = await run("sh doesnotexist.sh");
    assertEqual(r.exitCode, 127);
});

test("running sh on a non-executable file fails with exit code 126", async () => {
    makeFile("notexec.sh", "echo hi\n"); // no { executable: true }
    const r = await run("sh notexec.sh");
    assertEqual(r.exitCode, 126);
});

})();
