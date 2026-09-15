(function () {
"use strict";
const { describe, test, terminal, assertEqual } = typeof module !== "undefined" ? require("./harness") : window.TestHarness;

// saveSettings() (and specifically the expensive full-filesystem
// re-serialization it does when fsDirty) should happen once per command
// line, no matter how many filesystem-mutating things that one command
// line did internally (multiple redirects, a pipe, ...). This exercises
// handleEnter() directly (not the harness's run()) since that's the only
// path that actually calls saveSettings() - see tests/README.md.
describe("saveSettings() runs once per command, not once per internal filesystem write");

async function countSaves(commandLine) {
    let saveCount = 0;
    let fsWriteCount = 0;
    const origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (key, val) {
        if (key.toLowerCase().includes("filesystem")) fsWriteCount++;
        return origSetItem(key, val);
    };
    const origSave = terminal.saveSettings.bind(terminal);
    terminal.saveSettings = function (...args) {
        saveCount++;
        return origSave(...args);
    };
    try {
        terminal.currentInput = commandLine;
        await terminal.handleEnter();
    } finally {
        localStorage.setItem = origSetItem;
        terminal.saveSettings = origSave;
    }
    return { saveCount, fsWriteCount };
}

test("a command with several chained output redirects still only saves once", async () => {
    const { saveCount, fsWriteCount } = await countSaves("echo hi > a > b > c");
    assertEqual(saveCount, 1);
    assertEqual(fsWriteCount, 1);
});

test("a plain non-mutating command doesn't re-serialize the filesystem at all", async () => {
    const { saveCount, fsWriteCount } = await countSaves("echo hi");
    assertEqual(saveCount, 1); // settings (history, cwd, ...) still saves
    assertEqual(fsWriteCount, 0); // but nothing touched the filesystem
});

})();
