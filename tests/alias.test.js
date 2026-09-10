(function () {
"use strict";

const { describe, test, run, assert, assertEqual, assertIncludes, terminal } = typeof module !== "undefined" ? require("./harness") : window.TestHarness;

describe("alias: bare NAME shows that one alias's definition");

test("alias with no args lists everything", async () => {
    terminal.aliases = { ll: "ls -la" };
    const r = await run("alias");
    assertEqual(r.stdout, "alias ll='ls -la'");
});

test("alias NAME (bare, no =) shows just that one alias", async () => {
    terminal.aliases = { ll: "ls -la", "cd..": "cd .." };
    const r = await run("alias ll");
    assertEqual(r.stdout, "alias ll='ls -la'");
});

test("alias for an unknown name reports it as not found", async () => {
    const r = await run("alias doesnotexist");
    assertEqual(r.exitCode, 1);
    assertIncludes(r.stdout, "not found");
});

test("alias NAME=VALUE still defines an alias", async () => {
    await run("alias newone='echo hi'");
    assertEqual(terminal.aliases.newone, "echo hi");
});

test("mixing a lookup and an assignment in one call", async () => {
    terminal.aliases = { ll: "ls -la" };
    const r = await run("alias foo=bar ll");
    assertEqual(terminal.aliases.foo, "bar");
    assertEqual(r.stdout, "alias ll='ls -la'");
});

})();
