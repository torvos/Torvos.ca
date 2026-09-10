/**
 * Browser-side counterpart to tests/harness.js (the Node version) - same
 * API surface (test, describe, run, assert*, makeFile, makeDir, terminal,
 * FileSystemAPI), so every *.test.js file works unchanged in both
 * environments via the one-line dual-mode require at the top of each file:
 *
 *     const { ... } = typeof module !== "undefined" ? require("./harness") : window.TestHarness;
 *
 * Loaded AFTER every app script (constants.js ... bootstrap.js) but
 * BEFORE any *.test.js file - see test.html for the full order. It needs
 * TerminalEngine/FileSystemAPI/createVirtualBin to already exist (to
 * construct `terminal` eagerly, synchronously, exactly like the Node
 * harness does - see the comment on `terminal` below for why that
 * timing matters), and every *.test.js file needs `terminal` to already
 * be a stable object reference by the time IT loads, since each one
 * destructures it once at the top rather than re-reading it per test.
 *
 * localStorage isolation happens separately, in isolate-storage.js,
 * which test.html loads first - before this file, before every app
 * script, before anything that could touch it.
 */
(function () {
    "use strict";

    // Constructed eagerly and synchronously (not inside an async boot()
    // function) so that by the time *.test.js files load right after this
    // one and do `const { terminal } = window.TestHarness;`, they get a
    // real, stable object reference - init() hasn't necessarily finished
    // yet, but the object itself never gets replaced, so every test
    // function reading terminal.cwd/terminal.execute(...) etc. later is
    // reading off that same live object. This exactly mirrors how the
    // Node harness works (construct now, await readiness later).
    const terminal = new TerminalEngine();
    terminal.sleep = async () => {};

    let written = [];
    const realWrite = terminal.write.bind(terminal);
    terminal.write = function (text, opts) {
        written.push(
            Array.isArray(text) ? text.map((seg) => seg.text ?? seg).join("") : String(text)
        );
        return realWrite(text, opts);
    };

    // Started now, awaited later (inside runAll(), before the first
    // test) - same pattern as the Node harness's bootPromise.
    const bootPromise = terminal.init().then(() => {
        written = []; // discard the welcome banner text
    });

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
    function makeFile(targetPath, content, options) {
        content = content || "";
        const executable = options && options.executable;
        const parentInfo = FileSystemAPI.getParent(targetPath, terminal.cwd);
        const node = FileSystemAPI.createFile();
        parentInfo.parent.children[parentInfo.name] = node;
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
            current = current === "/" ? "/" + part : current + "/" + part;
        }
        return FileSystemAPI.get(current, terminal.cwd);
    }

    /** Restores a clean slate before each test - see harness.js's Node twin for details. */
    function resetState() {
        FileSystemAPI.resetToDefault();
        createVirtualBin();
        createVirtualDev();
        terminal.cwd = HOME;
        terminal.env = {
            HOME: HOME, USER: DEFAULT_USER, HOSTNAME: HOSTNAME, PWD: HOME, OLDPWD: HOME,
            SHELL: "/bin/bash", PATH: "/bin:/usr/bin", EDITOR: "edit", SCRIPTDEBUG: "false",
        };
        terminal.aliases = {};
        terminal.history = [];
        terminal.lastExitCode = 0;
        terminal._scriptStack = [];
        terminal._captureBuffer = undefined;
        written = [];
    }

    // -------------------------------------------------------------
    // Assertions
    // -------------------------------------------------------------
    function AssertionError(message) {
        this.message = message;
    }
    AssertionError.prototype = Object.create(Error.prototype);

    function assert(condition, message) {
        if (!condition) throw new AssertionError(message || "assertion failed");
    }
    function assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new AssertionError(
                (message ? message + " - " : "") +
                "expected " + JSON.stringify(expected) + ", got " + JSON.stringify(actual)
            );
        }
    }
    function assertIncludes(haystack, needle, message) {
        if (String(haystack).indexOf(needle) === -1) {
            throw new AssertionError(
                (message ? message + " - " : "") +
                "expected " + JSON.stringify(haystack) + " to include " + JSON.stringify(needle)
            );
        }
    }

    // -------------------------------------------------------------
    // Test registration / execution - same shape as the Node runner,
    // rendering results into the page instead of the console (though it
    // also logs to the console, for anyone checking devtools).
    // -------------------------------------------------------------
    const tests = [];
    let currentFileLabel = "";

    function describe(label) {
        currentFileLabel = label;
    }
    function test(name, fn) {
        tests.push({ name: name, fn: fn, fileLabel: currentFileLabel });
    }

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    async function runAll() {
        await bootPromise;

        const outputEl = document.getElementById("test-output");
        let html = "";
        let passed = 0;
        let failed = 0;
        let lastFileLabel = null;

        for (const entry of tests) {
            if (entry.fileLabel !== lastFileLabel) {
                html += '<div class="test-file-header">' + escapeHtml(entry.fileLabel) + "</div>";
                console.log("\n" + entry.fileLabel);
                lastFileLabel = entry.fileLabel;
            }
            resetState();
            try {
                await entry.fn();
                passed++;
                html += '<div class="test-ok">ok &nbsp; ' + escapeHtml(entry.name) + "</div>";
                console.log("  ok   " + entry.name);
            } catch (err) {
                failed++;
                html +=
                    '<div class="test-fail">FAIL ' + escapeHtml(entry.name) + "</div>" +
                    '<div class="test-fail-detail">' + escapeHtml(err.message) + "</div>";
                console.log("  FAIL " + entry.name);
                console.log("       " + err.message);
            }
            // Stream results as they complete rather than all at once at the end
            if (outputEl) outputEl.innerHTML = html;
        }

        const summaryClass = failed === 0 ? "test-ok" : "test-fail";
        html += '<div id="test-summary" class="' + summaryClass + '">' +
            passed + " passed, " + failed + " failed, " + (passed + failed) + " total</div>";
        if (outputEl) outputEl.innerHTML = html;
        console.log("\n" + passed + " passed, " + failed + " failed, " + (passed + failed) + " total\n");

        return failed === 0;
    }

    window.TestHarness = {
        terminal: terminal,
        FileSystemAPI: FileSystemAPI,
        run: run,
        makeFile: makeFile,
        makeDir: makeDir,
        resetState: resetState,
        assert: assert,
        assertEqual: assertEqual,
        assertIncludes: assertIncludes,
        describe: describe,
        test: test,
        runAll: runAll,
    };
})();
