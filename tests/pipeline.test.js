(function () {
"use strict";

const { describe, test, run, assert, assertEqual } = typeof module !== "undefined" ? require("./harness") : window.TestHarness;

describe("pipeline: a stage's exit code doesn't abort the rest of the pipe");

test("false | echo hello - echo still runs", async () => {
    const r = await run("false | echo hello");
    assertEqual(r.stdout, "hello");
});

test("true | echo hello - sanity check for the success path", async () => {
    const r = await run("true | echo hello");
    assertEqual(r.stdout, "hello");
});

test("a normal successful pipe still works", async () => {
    const r = await run("echo hi | grep hi");
    assertEqual(r.stdout, "hi");
});

test("a failing MIDDLE stage still lets the pipeline reach the end", async () => {
    const r = await run("false | false | echo hello");
    assertEqual(r.stdout, "hello");
});

test("last stage failing sets the overall exit code to 1", async () => {
    const r = await run("echo hi | false");
    assertEqual(r.exitCode, 1);
});

test("a failed grep mid-pipe still lets the pipeline continue", async () => {
    const r = await run("echo hi | grep nomatch | echo after");
    assertEqual(r.stdout, "after");
});

})();
