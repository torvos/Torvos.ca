const { describe, test, run, assert, assertEqual, assertIncludes, makeDir, terminal, FileSystemAPI } = require("./harness");

describe("mv: refuses to move a directory into its own subtree");

test("moving a directory into its own subdirectory is rejected", async () => {
    makeDir("dirA/sub");
    const r = await run("mv dirA dirA/sub/dirA");
    assertEqual(r.exitCode, 1);
    assert(!FileSystemAPI.get("dirA/sub/dirA", terminal.cwd), "the cyclic move must not have happened");
});

test("moving a directory onto itself (already exists) is rejected, not turned into a cycle", async () => {
    makeDir("dirD");
    const r = await run("mv dirD dirD");
    assertEqual(r.exitCode, 1);
    // Before the fix, this specific case created a node containing itself
    // as its own child - confirm dirD's children object doesn't reference
    // itself under its own name.
    const dirD = FileSystemAPI.get("dirD", terminal.cwd);
    assert(dirD.children.dirD === undefined, "dirD must not contain itself");
});

test("a normal rename still works", async () => {
    makeDir("dirB");
    const r = await run("mv dirB dirB2");
    assertEqual(r.exitCode, 0);
    assert(!!FileSystemAPI.get("dirB2", terminal.cwd));
    assert(!FileSystemAPI.get("dirB", terminal.cwd));
});

test("moving a directory into an unrelated directory still works", async () => {
    makeDir("dirC");
    makeDir("dirA/sub");
    const r = await run("mv dirC dirA/sub/dirC");
    assertEqual(r.exitCode, 0);
    assert(!!FileSystemAPI.get("dirA/sub/dirC", terminal.cwd));
});
