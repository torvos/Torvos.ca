# Tests

A small, permanent regression suite that can run two ways - in Node
(fast, for everyday use and CI) or in an actual browser via
`test.html` (closer to how the real app actually runs). Both boot the
*real* app (every script loaded in the exact order `index.html` uses)
and drive it through the actual command pipeline - not a reimplemented
shortcut - so a passing suite means the real thing works.

## Running in Node

```
node tests/run-tests.js
```

Exits `0` if everything passed, `1` otherwise - safe to wire into a
pre-commit hook or CI with no extra setup (no npm install needed; the
harness only uses Node's built-ins).

## Running in a browser

Open `test.html` (serve the project root with any static file server,
e.g. `python3 -m http.server`, and navigate to `/test.html` - opening it
directly via `file://` may also work depending on the browser). It
boots a real, separate terminal instance on that page and streams
results into it as they run.

This is a genuinely separate, isolated session - it does **not** touch
the actual saved session you have open at `index.html`, even though
they'd normally share `localStorage` on the same origin. `test.html`
swaps in a throwaway in-memory store before any app script can run
(`tests/isolate-storage.js`, loaded first) specifically so running the
suite can never read or overwrite your real saved terminal state.

## Adding a test

Drop a new `something.test.js` file in this directory:

```js
(function () {
"use strict";

const { describe, test, run, assert, assertEqual, assertIncludes,
        makeFile, makeDir, terminal, FileSystemAPI } =
    typeof module !== "undefined" ? require("./harness") : window.TestHarness;

describe("what this file covers");

test("a specific, descriptive behavior", async () => {
    makeFile("a.txt", "hello\n");
    const r = await run("cat a.txt");
    assertEqual(r.stdout, "hello");
});

})();
```

It's picked up automatically next run (in both Node and `test.html`) -
nothing else to register. Two things worth keeping when copying this
template:

- **The dual-mode first line.** `require("./harness")` only exists in
  Node; `window.TestHarness` is how `test.html` exposes the identical
  API (see `tests/browser-harness.js`). This one line is what makes the
  same test file work in both places unchanged.
- **The wrapping IIFE.** In Node, `require()` gives each file its own
  module scope for free, so `const describe` in one file can't collide
  with another's. Classic `<script>` tags in a browser don't have that -
  every top-level `const` in every loaded file shares one global scope,
  so without the IIFE, the second test file to load would throw
  `Identifier 'describe' has already been declared`. The IIFE is what
  gives each file its own scope in *both* environments.

Each test gets a fresh filesystem and fresh `terminal.cwd`/`env`/
`history`/`aliases` automatically before it runs (see `resetState()` in
`harness.js`/`browser-harness.js`), so tests don't need to clean up
after themselves and don't depend on run order.

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

- Coverage here is a curated set of the highest-value regressions from
  this project's history, not exhaustive - most commands don't have
  tests yet. Good candidates for next additions: `sort`, `uniq`, `diff`,
  `sed`, `tr`, the hash commands, and the parser's brace/variable/
  arithmetic expansion.
- There's no in-terminal `test` command (running the suite from inside
  the live app as you'd type any other command) - `test.html`'s
  isolated-session approach is the safer choice for now. Adding one
  later is a natural follow-up since the browser-side pieces already
  exist, but it would need its own safety net (probably snapshotting
  and restoring the user's real session around the run) since it'd be
  running against the actual live filesystem instead of a throwaway one.

