/**
 * Reusable test harness for Torvos: boots the *real* app (every script,
 * in the exact order index.html loads them) inside plain Node, with just
 * enough of a DOM/browser stub for TerminalEngine's constructor and
 * init() to run to completion - so tests exercise the actual production
 * code paths, not a reimplemented shortcut.
 *
 * Design notes for anyone extending this:
 * - The whole app boots ONCE per test process (see the bottom of this
 *   file). All *.test.js files that require('./harness') in the same
 *   `node tests/run-tests.js` run share that one boot and one live
 *   `terminal`/`FileSystemAPI`. This is what makes the suite fast.
 * - Isolation between tests instead comes from resetState(), called
 *   automatically before every test() - it restores the filesystem to
 *   its seed defaults and resets terminal.cwd/env/history/aliases/
 *   lastExitCode, so one test's leftover files or state can't leak into
 *   the next.
 * - test() only REGISTERS a test (synchronous, cheap) - nothing runs
 *   until runAll() is called at the very end by run-tests.js. This
 *   keeps registration (which happens as each *.test.js file is
 *   require()'d) separate from execution (which is async and must run
 *   one test at a time, since tests share the same mutable engine state).
 */
"use strict";

const vm = require("vm");
const fs = require("fs");
const path = require("path");

const JS_ROOT = path.join(__dirname, "..", "js");

// ---------------------------------------------------------------------
// Minimal DOM/browser stubs
// ---------------------------------------------------------------------
// A Proxy-backed stand-in for any DOM element TerminalEngine touches
// (output pane, input line, editor textarea, ...). Real property reads/
// writes (style, classList, scrollTop, ...) work like a plain object;
// any METHOD call it doesn't already have (appendChild, replaceChildren,
// querySelectorAll, focus, ...) is silently a no-op returning undefined,
// so the harness doesn't need to enumerate every DOM method the app
// might call - only the couple of properties it actually reads back.
function makeDomStub() {
    return new Proxy(
        {
            style: {},
            classList: { add() {}, remove() {}, contains: () => false },
            scrollTop: 0,
            scrollHeight: 0,
            clientHeight: 600,
            value: "",
        },
        {
            get(target, prop) {
                if (prop in target) return target[prop];
                if (prop === "querySelectorAll" || prop === "children") return () => [];
                return function () { return undefined; };
            },
            set(target, prop, value) {
                target[prop] = value;
                return true;
            },
        }
    );
}

global.window = global;
// Node 21+ ships its own read-only `navigator` global for web compat -
// override it via defineProperty rather than plain assignment.
Object.defineProperty(global, "navigator", {
    value: { userAgent: "" },
    writable: true,
    configurable: true,
});
global.getComputedStyle = () => ({ lineHeight: "16px" });
global.location = { search: "", reload() {} };

const storageBackend = {};
global.localStorage = {
    getItem(key) {
        return Object.prototype.hasOwnProperty.call(storageBackend, key) ? storageBackend[key] : null;
    },
    setItem(key, value) { storageBackend[key] = value; },
    removeItem(key) { delete storageBackend[key]; },
};

global.document = {
    addEventListener() {},
    getElementById() { return makeDomStub(); },
    createElement() { return makeDomStub(); },
};

window.addEventListener = function () {};
window.visualViewport = { addEventListener() {}, height: 800 };

// ---------------------------------------------------------------------
// Load every script in the exact order index.html uses. Files with
// top-level `const`/`class` declarations meant to be visible as bare
// globals to every later script (constants.js, core.js) are loaded via
// vm.runInThisContext, matching how a real <script> tag behaves - a
// plain require() would scope those declarations to its own module
// wrapper instead of the shared global scope. Everything else attaches
// itself via `window.X = ...` / `Object.assign(TerminalEngine.prototype, ...)`
// property assignment, which works fine through plain require().
// ---------------------------------------------------------------------
function loadAsScript(relativePath) {
    const fullPath = path.join(JS_ROOT, relativePath);
    vm.runInThisContext(fs.readFileSync(fullPath, "utf8"), { filename: relativePath });
}
function loadAsModule(relativePath) {
    require(path.join(JS_ROOT, relativePath));
}

loadAsScript("constants.js");
loadAsScript("terminal/core.js");

loadAsModule("filesystem/seed.js");
loadAsModule("filesystem/mode.js");
loadAsModule("filesystem/format.js");
loadAsModule("filesystem/nodes.js");
loadAsModule("filesystem/fileapi.js");
loadAsModule("filesystem/devices.js");
loadAsModule("commands.js");
loadAsModule("terminal/bootstrap.js");
loadAsModule("terminal/parser.js");
loadAsModule("terminal/arithmetic.js");
loadAsModule("terminal/render.js");
loadAsModule("terminal/execute.js");
loadAsModule("terminal/input.js");
loadAsModule("terminal/editor.js");

const commandsDir = path.join(JS_ROOT, "commands");
for (const file of fs.readdirSync(commandsDir).sort()) {
    if (file.endsWith(".js")) loadAsModule(path.join("commands", file));
}

// ---------------------------------------------------------------------
// Boot one shared terminal instance for the whole test run
// ---------------------------------------------------------------------
const terminal = new TerminalEngine();
terminal.sleep = async () => {}; // skip real animation delays in tests

let written = [];
const realWrite = terminal.write.bind(terminal);
terminal.write = function (text, opts) {
    written.push(
        Array.isArray(text) ? text.map((seg) => seg.text ?? seg).join("") : String(text)
    );
    return realWrite(text, opts);
};

// init() runs the real boot sequence (seed reconciliation, welcome
// banner, etc.) - synchronously awaited here so it's fully done before
// any test runs. The banner text it writes is discarded immediately
// below rather than leaking into the first test's output.
const bootPromise = terminal.init();

// ---------------------------------------------------------------------
// Test-facing helpers
// ---------------------------------------------------------------------

/** Runs one command line through the real pipeline, capturing output. */
async function run(commandLine) {
    written = [];
    await terminal.execute(commandLine);
    return {
        stdout: written.join("\n"),
        exitCode: terminal.lastExitCode,
    };
}

/** Creates a file with the given content (and, optionally, execute permission). */
function makeFile(targetPath, content = "", { executable = false } = {}) {
    const { parent, name } = FileSystemAPI.getParent(targetPath, terminal.cwd);
    const node = FileSystemAPI.createFile();
    parent.children[name] = node;
    FileSystemAPI.writeContent(node, content);
    if (executable) node.mode = "rwxr-xr-x";
    return node;
}

/** Creates a directory (and any missing parents), like `mkdir -p`. */
function makeDir(targetPath) {
    const parts = FileSystemAPI.getFullPath(targetPath, terminal.cwd).split("/").filter(Boolean);
    let current = "/";
    for (const part of parts) {
        const node = FileSystemAPI.get(current, terminal.cwd);
        if (!node.children[part]) {
            node.children[part] = FileSystemAPI.createDirectory();
        }
        current = current === "/" ? `/${part}` : `${current}/${part}`;
    }
    return FileSystemAPI.get(current, terminal.cwd);
}

/** Restores a clean slate before each test - see the file header comment. */
function resetState() {
    FileSystemAPI.resetToDefault();
    // resetToDefault() restores only the STATIC seed tree - /bin and /dev
    // are populated separately, dynamically, once at real boot time (see
    // bootstrap.js), so they need to be rebuilt here too or every test
    // after the first would run against an empty /bin (breaking `which`,
    // running any /bin command by path, etc).
    createVirtualBin();
    createVirtualDev();
    terminal.cwd = HOME;
    terminal.env = { HOME, USER: DEFAULT_USER, HOSTNAME, PWD: HOME, OLDPWD: HOME, SHELL: "/bin/bash", PATH: "/bin:/usr/bin", EDITOR: "edit", SCRIPTDEBUG: "false" };
    terminal.aliases = {};
    terminal.history = [];
    terminal.lastExitCode = 0;
    terminal._scriptStack = [];
    terminal._captureBuffer = undefined;
    written = [];
}

class AssertionError extends Error {}

function assert(condition, message = "assertion failed") {
    if (!condition) throw new AssertionError(message);
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new AssertionError(
            `${message ? message + " - " : ""}expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
        );
    }
}

function assertIncludes(haystack, needle, message) {
    if (!String(haystack).includes(needle)) {
        throw new AssertionError(
            `${message ? message + " - " : ""}expected ${JSON.stringify(haystack)} to include ${JSON.stringify(needle)}`
        );
    }
}

// ---------------------------------------------------------------------
// Test registration / execution
// ---------------------------------------------------------------------
const tests = [];
let currentFileLabel = "";

/** Sets the label shown before this file's tests in the run output. */
function describe(label) {
    currentFileLabel = label;
}

/** Registers a test. Nothing runs until runAll() is called. */
function test(name, fn) {
    tests.push({ name, fn, fileLabel: currentFileLabel });
}

async function runAll() {
    await bootPromise;

    let passed = 0;
    let failed = 0;
    let lastFileLabel = null;

    for (const { name, fn, fileLabel } of tests) {
        if (fileLabel !== lastFileLabel) {
            console.log(`\n${fileLabel}`);
            lastFileLabel = fileLabel;
        }
        resetState();
        try {
            await fn();
            passed++;
            console.log(`  ok   ${name}`);
        } catch (err) {
            failed++;
            console.log(`  FAIL ${name}`);
            console.log(`       ${err.message}`);
        }
    }

    console.log(`\n${passed} passed, ${failed} failed, ${passed + failed} total\n`);
    return failed === 0;
}

module.exports = {
    terminal,
    FileSystemAPI: global.FileSystemAPI,
    run,
    makeFile,
    makeDir,
    resetState,
    assert,
    assertEqual,
    assertIncludes,
    describe,
    test,
    runAll,
};
