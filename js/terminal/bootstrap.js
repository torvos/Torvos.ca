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
