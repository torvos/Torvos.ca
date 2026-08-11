/**
 * Builds the virtual /bin directory, populating it with one file entry
 * per registered command (from window.Commands) so that commands like
 * `ls /bin` or `which` can "see" them as real files, then mounts it
 * into the virtual filesystem.
 */
window.createVirtualBin = function() {
    const bin = {
        type: "dir",
        hidden: false,
        mode: "rwxr-xr-x",
        owner: "root",
        group: "root",
        created: Date.parse("2020-01-01T08:00:00Z"),
        modified: Date.parse("2026-07-01T10:00:00Z"),
        accessed: Date.parse("2026-07-01T10:00:00Z"),
        children: {}
    };

    // Create a (contentless) executable file entry for every registered command
    for (const command of Object.keys(Commands).sort()) {
        bin.children[command] = {
            type: "file",
            hidden: false,
            mode: "rwxr-xr-x",
            owner: "root",
            group: "root",
            created: Date.parse("2020-01-01T08:00:00Z"),
            modified: Date.parse("2026-07-01T10:00:00Z"),
            accessed: Date.parse("2026-07-01T10:00:00Z"),
            content: ""
        };
    }
    FileSystemAPI.mount("bin", bin);
};

/**
 * Builds the virtual /dev directory with a handful of standard Unix
 * device files (null, zero, random) and mounts it into the virtual
 * filesystem so commands can reference paths like /dev/null.
 */
window.createVirtualDev = function() {
    const dev = {
        type: "dir",
        hidden: false,
        mode: "rwxr-xr-x",
        owner: "root",
        group: "root",
        created: Date.parse("2020-01-01T08:00:00Z"),
        modified: Date.parse("2026-07-01T10:00:00Z"),
        accessed: Date.parse("2026-07-01T10:00:00Z"),
        children: {}
    };

    // /dev/null - discards anything written to it (standard "bit bucket")
    dev.children["null"] = {
        type: "device",
        device: "null",
        hidden: false,
        mode: "rw-rw-rw-",
        owner: "root",
        group: "root",
        created: Date.parse("2020-01-01T08:00:00Z"),
        modified: Date.parse("2026-07-01T10:00:00Z"),
        accessed: Date.parse("2026-07-01T10:00:00Z"),
        content: ""
    };

    // /dev/zero - conceptually yields endless zero bytes when read
    dev.children["zero"] = {
        type: "device",
        device: "zero",
        hidden: false,
        mode: "rw-rw-rw-",
        owner: "root",
        group: "root",
        created: Date.parse("2020-01-01T08:00:00Z"),
        modified: Date.parse("2026-07-01T10:00:00Z"),
        accessed: Date.parse("2026-07-01T10:00:00Z"),
        content: ""
    };    

    // /dev/random - conceptually yields random bytes when read
    dev.children["random"] = {
        type: "device",
        device: "random",
        hidden: false,
        mode: "rw-rw-rw-",
        owner: "root",
        group: "root",
        created: Date.parse("2020-01-01T08:00:00Z"),
        modified: Date.parse("2026-07-01T10:00:00Z"),
        accessed: Date.parse("2026-07-01T10:00:00Z"),
        content: ""
    };    

    FileSystemAPI.mount("dev", dev);
};
