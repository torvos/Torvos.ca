# Tests

A small, permanent Node-based regression suite. Every test boots the
*real* app (every script loaded in the exact order `index.html` uses)
and drives it through the actual command pipeline - not a reimplemented
shortcut - so a passing suite means the real thing works.

## Running

```
node tests/run-tests.js
```

Exits `0` if everything passed, `1` otherwise - safe to wire into a
pre-commit hook or CI with no extra setup (no npm install needed; the
harness only uses Node's built-ins).

## Adding a test

Drop a new `something.test.js` file in this directory:

```js
const { describe, test, run, assert, assertEqual, assertIncludes,
        makeFile, makeDir, terminal, FileSystemAPI } = require("./harness");

describe("what this file covers");

test("a specific, descriptive behavior", async () => {
    makeFile("a.txt", "hello\n");
    const r = await run("cat a.txt");
    assertEqual(r.stdout, "hello");
});
```

It's picked up automatically next run - nothing else to register. Each
test gets a fresh filesystem and fresh `terminal.cwd`/`env`/`history`/
`aliases` automatically before it runs (see `resetState()` in
`harness.js`), so tests don't need to clean up after themselves and
don't depend on run order.

`run(commandLine)` returns `{ stdout, exitCode }`, where `stdout` is
everything the command actually printed to the screen (both normal
output and formatted error lines) - it does not distinguish stdout from
stderr, since that's how the terminal itself presents them.

### Testing input.js features (history recall, key handling, etc.)

`run()` calls `terminal.execute()` directly, which bypasses `input.js`
entirely - fine for testing commands, but not for features that live in
`handleEnter()` itself (like `!!`/`!N` history expansion). For those,
call `terminal.handleEnter()` directly instead; see `history.test.js`
for the pattern (it temporarily intercepts `terminal.write` to capture
what gets printed, since `run()`'s own capture only wraps `execute()`).

## Known gaps

- `find.test.js` has a note on two tests that work around a real,
  separate bug: quoting a wildcard pattern (`find . -name "*.txt"`)
  doesn't currently protect it from the shell's own glob expansion,
  because quote information is lost by the time arguments reach that
  expansion step. Worth fixing on its own - see the comment in that file
  for a minimal repro (`echo "*.txt"` expands when it shouldn't).
- Coverage here is a curated set of the highest-value regressions from
  this project's history, not exhaustive - most commands don't have
  tests yet. Good candidates for next additions: `sort`, `uniq`, `diff`,
  `sed`, `tr`, the hash commands, and the parser's brace/variable/
  arithmetic expansion.
