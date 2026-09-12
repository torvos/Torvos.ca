(function () {
"use strict";
const { describe, test, run, makeFile, assertEqual } = typeof module !== "undefined" ? require("./harness") : window.TestHarness;

describe("multiple redirections on one command are all recognized, and behave like a real shell's sequential fd setup");

test("chained `>` - only the LAST target gets the real output, earlier ones end up empty", async () => {
    const r = await run("echo hi > a > b; echo b=[$(cat b)]; echo a=[$(cat a)]");
    assertEqual(r.stdout, "b=[hi]\na=[]");
});

test("chained `>>` - only the LAST target gets appended, earlier ones are untouched (but still created)", async () => {
    const r = await run("echo one >> app1; echo two >> app1 >> app2; echo app1=[$(cat app1)]; echo app2=[$(cat app2)]");
    assertEqual(r.stdout, "app1=[one]\napp2=[two]");
});

test("chained `2>` - only the LAST target gets the real stderr, earlier ones end up empty", async () => {
    const r = await run("cat nope.txt 2> e1 2> e2; echo e1=[$(cat e1)]; echo e2=[$(cat e2)]");
    assertEqual(r.stdout, "e1=[]\ne2=[cat: no such file: nope.txt]");
});

test("`<` and `>` combined on one command both work", async () => {
    makeFile("in2.txt", "hello\n");
    const r = await run("cat < in2.txt > out2.txt; echo out2=[$(cat out2.txt)]");
    assertEqual(r.stdout, "out2=[hello]");
});

test("a failing earlier redirect stops the whole command - later redirects never run, target never created", async () => {
    const r1 = await run("cat < a1nonexist > out1noexist");
    assertEqual(r1.stdout, "a1nonexist: No such file");
    assertEqual(r1.exitCode, 1);

    const r2 = await run("ls out1noexist");
    assertEqual(r2.exitCode, 1); // never created
});

})();
