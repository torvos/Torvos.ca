(function () {
"use strict";

const { describe, test, run, assertEqual, makeFile } = typeof module !== "undefined" ? require("./harness") : window.TestHarness;

describe("&& / || conditional chaining");

test("&& runs the next command on success", async () => {
    const r = await run("true && echo yes");
    assertEqual(r.stdout, "yes");
});

test("&& skips the next command on failure", async () => {
    const r = await run("false && echo yes");
    assertEqual(r.stdout, "");
});

test("|| skips the next command on success", async () => {
    const r = await run("true || echo fallback");
    assertEqual(r.stdout, "");
});

test("|| runs the next command on failure", async () => {
    const r = await run("false || echo fallback");
    assertEqual(r.stdout, "fallback");
});

test("chained: false && echo a || echo b runs only echo b", async () => {
    const r = await run("false && echo a || echo b");
    assertEqual(r.stdout, "b");
});

test("chained: true && echo a || echo b runs only echo a", async () => {
    const r = await run("true && echo a || echo b");
    assertEqual(r.stdout, "a");
});

test("a longer chain: true && true && echo deep", async () => {
    const r = await run("true && true && echo deep");
    assertEqual(r.stdout, "deep");
});

test("a failure partway through a chain stops the rest of the && sequence", async () => {
    const r = await run("true && false && echo never");
    assertEqual(r.stdout, "");
});

test("each ;-separated group is evaluated independently of earlier &&/|| chains", async () => {
    const r = await run("false && echo a; echo always");
    assertEqual(r.stdout, "always");
});

test("composes with pipes: (echo hi | grep hi) && echo found", async () => {
    const r = await run("echo hi | grep hi && echo found");
    assertEqual(r.stdout, "hi\nfound");
});

test("a quoted && inside a string is not treated as an operator", async () => {
    const r = await run('echo "a && b"');
    assertEqual(r.stdout, "a && b");
});

test("&& works inside a script too", async () => {
    makeFile("andor.sh", "true && echo from-script\n", { executable: true });
    const r = await run("sh andor.sh");
    assertEqual(r.stdout, "from-script");
});

})();
