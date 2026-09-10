(function () {
"use strict";

const { describe, test, run, assert, assertEqual, makeFile, makeDir, terminal, FileSystemAPI } = typeof module !== "undefined" ? require("./harness") : window.TestHarness;

describe("chmod: symbolic mode syntax");

async function modeAfter(startMode, modeArg) {
    makeFile("f.txt", "");
    FileSystemAPI.get("f.txt", terminal.cwd).mode = startMode;
    const r = await run(`chmod ${modeArg} f.txt`);
    return { mode: FileSystemAPI.get("f.txt", terminal.cwd).mode, result: r };
}

test("comma-separated clauses: u+rwx,g-w,o=", async () => {
    const { mode } = await modeAfter("rw-r--r--", "u+rwx,g-w,o=");
    assertEqual(mode, "rwxr-----");
});

test("multiple classes in one clause: ug+rw", async () => {
    const { mode } = await modeAfter("---------", "ug+rw");
    assertEqual(mode, "rw-rw----");
});

test("all classes: a-rwx", async () => {
    const { mode } = await modeAfter("rwxrwxrwx", "a-rwx");
    assertEqual(mode, "---------");
});

test("bare +x with no class defaults to all classes", async () => {
    const { mode } = await modeAfter("rw-r--r--", "+x");
    assertEqual(mode, "rwxr-xr-x");
});

test("bare -w with no class - also confirms it isn't swallowed as an unknown flag", async () => {
    const { mode } = await modeAfter("rwxrwxrwx", "-w");
    assertEqual(mode, "r-xr-xr-x");
});

test("o= alone clears just that class", async () => {
    const { mode } = await modeAfter("rwxrwxrwx", "o=");
    assertEqual(mode, "rwxrwx---");
});

test("invalid syntax is rejected with a clear error, not silently ignored", async () => {
    const { mode, result } = await modeAfter("rw-r--r--", "xyz123");
    assertEqual(mode, "rw-r--r--");
    assertEqual(result.exitCode, 1);
});

test("numeric modes still work", async () => {
    const { mode } = await modeAfter("rw-r--r--", "755");
    assertEqual(mode, "rwxr-xr-x");
});

test("-R recursion still works, including with a dash-leading mode", async () => {
    makeDir("adir");
    makeFile("adir/inner.txt", "");
    FileSystemAPI.get("adir/inner.txt", terminal.cwd).mode = "rwxrwxrwx";
    await run("chmod -R -w adir");
    assertEqual(FileSystemAPI.get("adir/inner.txt", terminal.cwd).mode, "r-xr-xr-x");
});

})();
