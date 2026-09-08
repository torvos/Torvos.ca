const { describe, test, run, assertEqual } = require("./harness");

describe("which: finds commands via piped stdin (trailing newline must not break the lookup)");

test("which with a direct argument", async () => {
    const r = await run("which ls");
    assertEqual(r.stdout, "/bin/ls");
});

test("which via piped stdin (e.g. echo ls | which) finds a real command", async () => {
    const r = await run("echo ls | which");
    assertEqual(r.stdout, "/bin/ls");
});

test("which via piped stdin for a nonexistent command still fails cleanly", async () => {
    const r = await run("echo notarealcommand | which");
    assertEqual(r.exitCode, 1);
});
