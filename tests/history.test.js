const { describe, test, terminal, assert, assertEqual, assertIncludes } = require("./harness");

// !!/!N recall lives in handleEnter() (input.js), not execute() - so
// these tests go through handleEnter() directly (simulating "type a
// line, press Enter") rather than the harness's run() helper, which
// calls execute() straight and would bypass history recording/expansion
// entirely. terminal.write is intercepted locally for the duration of
// each call to capture what got printed.
async function typeAndEnter(commandLine) {
    const captured = [];
    const originalWrite = terminal.write;
    terminal.write = function (text) {
        captured.push(Array.isArray(text) ? text.map((s) => s.text ?? s).join("") : String(text));
    };
    terminal.currentInput = commandLine;
    try {
        await terminal.handleEnter();
    } finally {
        terminal.write = originalWrite;
    }
    return captured.join("\n");
}

describe("!!/!N history recall");

test("!! with empty history errors and runs nothing", async () => {
    const output = await typeAndEnter("!!");
    assertIncludes(output, "event not found");
    assertEqual(terminal.history.length, 0);
});

test("a normal command runs and is recorded in history", async () => {
    const output = await typeAndEnter("echo hello");
    assertIncludes(output, "hello");
    assertEqual(terminal.history[0], "echo hello");
});

test("!! recalls and runs the last command, recording the EXPANDED form", async () => {
    await typeAndEnter("echo hello");
    const output = await typeAndEnter("!!");
    assertIncludes(output, "hello");
    // Critical: history must record "echo hello", not the literal "!!" -
    // otherwise a second !! would just refer to itself.
    assertEqual(terminal.history[1], "echo hello");
});

test("!N recalls a specific numbered history entry", async () => {
    await typeAndEnter("echo hello"); // entry 1
    await typeAndEnter("pwd"); // entry 2
    const output = await typeAndEnter("!1");
    assertIncludes(output, "hello");
    assertEqual(terminal.history[2], "echo hello");
});

test("!N out of range errors and doesn't touch history", async () => {
    await typeAndEnter("echo hello");
    const lenBefore = terminal.history.length;
    const output = await typeAndEnter("!99");
    assertIncludes(output, "!99: event not found");
    assertEqual(terminal.history.length, lenBefore);
});

test("!0 is invalid (history is 1-indexed)", async () => {
    await typeAndEnter("echo hello");
    const output = await typeAndEnter("!0");
    assertIncludes(output, "!0: event not found");
});

test("a history reference can appear mid-line, not just standalone", async () => {
    await typeAndEnter("echo standalone");
    const output = await typeAndEnter("run !!");
    assertEqual(terminal.history[terminal.history.length - 1], "run echo standalone");
});

test("a plain command with no ! at all is unaffected", async () => {
    const output = await typeAndEnter("pwd");
    assertEqual(terminal.history[0], "pwd");
});
