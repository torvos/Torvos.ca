(function () {
"use strict";
const { describe, test, run, FileSystemAPI, assertEqual } = typeof module !== "undefined" ? require("./harness") : window.TestHarness;

describe("FileSystemAPI.restore() validates the structure of a saved filesystem, not just that it's valid JSON");

// Every check below restores the REAL saved tree back afterward so it
// doesn't leak a corrupted/defaulted filesystem into whatever test runs
// next in the shared suite.
async function checkRejected(json) {
    const real = FileSystemAPI.serialize();
    const ok = FileSystemAPI.restore(json);
    FileSystemAPI.restore(real);
    return ok;
}

test("a real serialize() -> restore() round-trip succeeds", async () => {
    const real = FileSystemAPI.serialize();
    assertEqual(FileSystemAPI.restore(real), true);
});

test("invalid JSON syntax is rejected", async () => {
    assertEqual(await checkRejected("{not valid json"), false);
});

test("valid JSON that isn't an object at all is rejected", async () => {
    assertEqual(await checkRejected("42"), false);
    assertEqual(await checkRejected("[1,2,3]"), false);
});

test("a tree with no root entry is rejected", async () => {
    assertEqual(await checkRejected(JSON.stringify({})), false);
});

test("a root that isn't a directory is rejected", async () => {
    const json = JSON.stringify({
        "/": { type: "file", mode: "rw-r--r--", owner: "g", group: "g", created: 1, modified: 1, content: "" }
    });
    assertEqual(await checkRejected(json), false);
});

test("a directory with no children object is rejected", async () => {
    const json = JSON.stringify({
        "/": { type: "dir", mode: "rwxr-xr-x", owner: "g", group: "g", created: 1, modified: 1 }
    });
    assertEqual(await checkRejected(json), false);
});

test("a file node with no content is rejected", async () => {
    const json = JSON.stringify({
        "/": { type: "dir", mode: "rwxr-xr-x", owner: "g", group: "g", created: 1, modified: 1, children: {
            "a.txt": { type: "file", mode: "rw-r--r--", owner: "g", group: "g", created: 1, modified: 1 }
        }}
    });
    assertEqual(await checkRejected(json), false);
});

test("a symlink node with no (or empty) target is rejected", async () => {
    const missing = JSON.stringify({
        "/": { type: "dir", mode: "rwxr-xr-x", owner: "g", group: "g", created: 1, modified: 1, children: {
            "link": { type: "symlink", mode: "rwxrwxrwx", owner: "g", group: "g", created: 1, modified: 1 }
        }}
    });
    assertEqual(await checkRejected(missing), false);

    const empty = JSON.stringify({
        "/": { type: "dir", mode: "rwxr-xr-x", owner: "g", group: "g", created: 1, modified: 1, children: {
            "link": { type: "symlink", target: "", mode: "rwxrwxrwx", owner: "g", group: "g", created: 1, modified: 1 }
        }}
    });
    assertEqual(await checkRejected(empty), false);
});

test("a malformed mode string is rejected", async () => {
    const json = JSON.stringify({
        "/": { type: "dir", mode: "garbage", owner: "g", group: "g", created: 1, modified: 1, children: {} }
    });
    assertEqual(await checkRejected(json), false);
});

test("an unrecognized node type is rejected", async () => {
    const json = JSON.stringify({
        "/": { type: "dir", mode: "rwxr-xr-x", owner: "g", group: "g", created: 1, modified: 1, children: {
            "weird": { type: "blackhole", mode: "rwxrwxrwx", owner: "g", group: "g", created: 1, modified: 1 }
        }}
    });
    assertEqual(await checkRejected(json), false);
});

test("a child literally named __proto__ is rejected", async () => {
    // Hand-written JSON text on purpose - building this through a JS
    // object literal instead would special-case "__proto__" as setting
    // the prototype rather than as a real object key, which wouldn't
    // actually exercise JSON.parse's (different) handling of that key.
    const json = '{"/":{"type":"dir","mode":"rwxr-xr-x","owner":"g","group":"g","created":1,"modified":1,'
        + '"children":{"__proto__":{"type":"file","mode":"rw-r--r--","owner":"g","group":"g","created":1,"modified":1,"content":""}}}}';
    assertEqual(await checkRejected(json), false);
});

test("restoring a corrupted save falls back to a fully usable default filesystem", async () => {
    const real = FileSystemAPI.serialize();
    FileSystemAPI.restore("{not valid json");
    const r = await run("ls /");
    assertEqual(r.exitCode, 0);
    FileSystemAPI.restore(real);
});

})();
