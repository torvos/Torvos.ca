const { describe, test, run, assertEqual } = require("./harness");

// Character codes, not escaped-string literals, so there's no ambiguity
// about how many backslashes are actually meant (this exact class of
// confusion is what caused the original bug, and separately nearly
// caused a bad fix during this project's history). Single-quoting the
// argument in the constructed command line matters too: real bash
// preserves everything literally inside single quotes, so what's built
// here is exactly what a real `echo -e '...'` at a real prompt would send.
function codes(s) {
    return [...s].map((c) => c.charCodeAt(0));
}
function fromCodes(...cs) {
    return String.fromCharCode(...cs);
}

describe("echo -e / printf: literal double-backslashes aren't mangled into escapes");

test("echo -e: a literal backslash-backslash-n stays backslash + 'n', not a newline", async () => {
    const arg = fromCodes(92, 92, 110); // backslash, backslash, 'n'
    const r = await run(`echo -e '${arg}'`);
    assertEqual(JSON.stringify(codes(r.stdout)), JSON.stringify([92, 110]));
});

test("echo -e: a single backslash-n still becomes a real newline", async () => {
    const arg = fromCodes(92, 110); // backslash, 'n'
    const r = await run(`echo -e '${arg}'`);
    assertEqual(JSON.stringify(codes(r.stdout)), JSON.stringify([10]));
});

test("echo -e: normal \\n and \\t escapes still work", async () => {
    // "line1\nline2\ttab" with single backslashes before n and t
    const arg = fromCodes(108,105,110,101,49,92,110,108,105,110,101,50,92,116,116,97,98);
    const r = await run(`echo -e '${arg}'`);
    assertEqual(r.stdout, "line1\nline2\ttab");
});

test("echo without -e does not process escapes at all", async () => {
    const arg = fromCodes(92, 92, 110);
    const r = await run(`echo '${arg}'`);
    assertEqual(JSON.stringify(codes(r.stdout)), JSON.stringify(codes(arg)));
});

test("printf: same double-backslash handling as echo -e", async () => {
    const arg = fromCodes(92, 92, 110);
    const r = await run(`printf '${arg}'`);
    assertEqual(JSON.stringify(codes(r.stdout)), JSON.stringify([92, 110]));
});
