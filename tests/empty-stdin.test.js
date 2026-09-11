(function () {
"use strict";
const { describe, test, run, assertEqual } = typeof module !== "undefined" ? require("./harness") : window.TestHarness;

describe("empty stdin is distinguishable from no stdin");

test("printf '' | cat prints nothing, not 'missing operand'", async () => {
    const r = await run("printf '' | cat");
    assertEqual(r.stdout, "");
    assertEqual(r.exitCode, 0);
});

test("cat with truly no stdin/args still errors", async () => {
    const r = await run("cat");
    assertEqual(r.exitCode, 1);
});

test("printf '' | wc counts zero", async () => {
    const r = await run("printf '' | wc");
    assertEqual(r.exitCode, 0);
});

test("printf '' | base64 encodes to nothing", async () => {
    const r = await run("printf '' | base64");
    assertEqual(r.stdout, "");
    assertEqual(r.exitCode, 0);
});

test("printf '' | tr a-z A-Z produces nothing, not an error", async () => {
    const r = await run("printf '' | tr a-z A-Z");
    assertEqual(r.stdout, "");
    assertEqual(r.exitCode, 0);
});

test("printf '' | sort sorts nothing", async () => {
    const r = await run("printf '' | sort");
    assertEqual(r.exitCode, 0);
});

test("printf '' | uniq produces nothing", async () => {
    const r = await run("printf '' | uniq");
    assertEqual(r.exitCode, 0);
});

test("printf '' | grep x finds nothing but isn't an error message", async () => {
    const r = await run("printf '' | grep x");
    assertEqual(r.stdout, "");
});

test("printf '' | head prints nothing", async () => {
    const r = await run("printf '' | head");
    assertEqual(r.exitCode, 0);
});

test("printf '' | tail prints nothing", async () => {
    const r = await run("printf '' | tail");
    assertEqual(r.exitCode, 0);
});

test("printf '' | md5sum still hashes the empty string", async () => {
    const r = await run("printf '' | md5sum");
    assertEqual(r.exitCode, 0);
});

test("printf '' | sha256sum still hashes the empty string", async () => {
    const r = await run("printf '' | sha256sum");
    assertEqual(r.exitCode, 0);
});

})();
