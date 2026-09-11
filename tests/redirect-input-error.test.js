(function () {
"use strict";
const { describe, test, run, assertEqual, makeFile } = typeof module !== "undefined" ? require("./harness") : window.TestHarness;

describe("`<` redirect failure sets a real exit status and doesn't abort the rest of the pipeline");

test("a failed `<` target makes the command fail, so && skips and || runs", async () => {
    const r = await run("false < /nope && echo yes || echo no");
    assertEqual(r.stdout, "/nope: No such file\nno");
});

test("a failed `<` on an earlier pipe stage still lets later stages run", async () => {
    const r = await run("cat < /nope | wc -l");
    assertEqual(r.stdout, "/nope: No such file\n0");
});

test("a failed `<` on a single (non-piped) command never runs the command, and reports failure", async () => {
    const r = await run("echo hi < /nope");
    assertEqual(r.stdout, "/nope: No such file");
    assertEqual(r.exitCode, 1);
});

test("sanity: `<` on a real file still works and reports success", async () => {
    makeFile("real.txt", "line1\nline2\nline3\n");
    const r = await run("cat < real.txt && echo yes || echo no");
    assertEqual(r.stdout, "line1\nline2\nline3\n\nyes");
});

test("sanity: `<` on a real file still pipes correctly downstream", async () => {
    makeFile("real2.txt", "line1\nline2\nline3\n");
    const r = await run("cat < real2.txt | wc -l");
    assertEqual(r.stdout, "3");
});

})();
