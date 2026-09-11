(function () {
"use strict";
const { describe, test, run, assertEqual } = typeof module !== "undefined" ? require("./harness") : window.TestHarness;

describe("$(...) command substitution respects quoting and escaping");

test("single-quoted $(...) is literal text, not run", async () => {
    const r = await run("echo '$(echo PWN)'");
    assertEqual(r.stdout, "$(echo PWN)");
});

test("a backslash-escaped $( is literal text, not run", async () => {
    const r = await run("echo \\$(echo PWN)");
    assertEqual(r.stdout, "$(echo PWN)");
});

test("double-quoted $(...) still substitutes (only single quotes suppress it)", async () => {
    const r = await run('echo "$(echo PWN)"');
    assertEqual(r.stdout, "PWN");
});

test("unquoted $(...) still substitutes (regression check)", async () => {
    const r = await run("echo $(echo PWN)");
    assertEqual(r.stdout, "PWN");
});

test("a backslash-escaped $( inside double quotes is also literal", async () => {
    const r = await run('echo "\\$(echo PWN)"');
    assertEqual(r.stdout, "$(echo PWN)");
});

test("mixing a literal single-quoted $(...) with a real unquoted one in the same word", async () => {
    const r = await run("echo 'literal $(echo a) and '$(echo b)");
    assertEqual(r.stdout, "literal $(echo a) and b");
});

test("parens inside a nested double-quoted string within $(...) don't unbalance matching", async () => {
    const r = await run('echo "nested: $(echo "(hi)")"');
    assertEqual(r.stdout, "nested: (hi)");
});

})();
