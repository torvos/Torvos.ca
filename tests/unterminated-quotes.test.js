(function () {
"use strict";
const { describe, test, run, assertEqual } = typeof module !== "undefined" ? require("./harness") : window.TestHarness;

describe("an unterminated quote is a syntax error, not silently accepted");

test("an unterminated double quote is rejected", async () => {
    const r = await run('echo "hello');
    assertEqual(r.stdout, "syntax error: unexpected end of file (unterminated quote)");
    assertEqual(r.exitCode, 2);
});

test("an unterminated single quote is rejected", async () => {
    const r = await run("echo 'hello");
    assertEqual(r.exitCode, 2);
});

test("an unterminated quote partway through a word is rejected", async () => {
    const r = await run("echo hello' world");
    assertEqual(r.exitCode, 2);
});

test("one properly closed quote plus one unterminated quote is still rejected", async () => {
    const r = await run('echo "a" "b');
    assertEqual(r.exitCode, 2);
});

test("an unterminated quote after a ; means NOTHING on the line runs, not just the bad part", async () => {
    const r = await run('echo hi; echo "unterminated');
    assertEqual(r.stdout, "syntax error: unexpected end of file (unterminated quote)");
});

test("an unterminated quote inside $(...) is also rejected", async () => {
    const r = await run('echo $(echo "hi)');
    assertEqual(r.exitCode, 2);
});

test("sanity: properly balanced quotes of both kinds still work", async () => {
    const r = await run("echo 'a' | wc -c");
    assertEqual(r.stdout, "1");
});

test("sanity: a quote nested inside the other quote type still works", async () => {
    const r = await run("echo \"it's fine\"");
    assertEqual(r.stdout, "it's fine");
});

})();
