window.numericToMode = function(value) {
    value = value.slice(-3);
    const map = {
        0: "---",
        1: "--x",
        2: "-w-",
        3: "-wx",
        4: "r--",
        5: "r-x",
        6: "rw-",
        7: "rwx"
    };
    return (
        map[value[0]] +
        map[value[1]] +
        map[value[2]]
    );
};

window.symbolicToMode = function(current, operation) {
    let chars = current.split("");
    const groups = {
        u: [0,1,2],
        g: [3,4,5],
        o: [6,7,8],
        a: [0,1,2,3,4,5,6,7,8]
    };
    const match = operation.match(/^([ugoa]+)([+-=])([rwx]+)$/);
    if (!match) {
        return current;
    }
    const users = match[1];
    const action = match[2];
    const permissions = match[3];
    for (const user of users) {
        const indexes = groups[user];
        for (const perm of permissions) {
            let offset;
            if (perm === "r") offset = 0;
            if (perm === "w") offset = 1;
            if (perm === "x") offset = 2;
            for (const index of indexes) {
                const relative = index % 3;
                if (relative === offset) {
                    if (action === "+") {
                        chars[index] = perm;
                    }
                    else if (action === "-") {
                        chars[index] = "-";
                    }
                    else if (action === "=") {
                        chars[index] = "-";
                    }
                }
            }
        }
        if (action === "=") {
            for (const index of indexes) {
                chars[index] = "-";
            }
            for (const perm of permissions) {
                let offset;
                if (perm === "r") offset = 0;
                if (perm === "w") offset = 1;
                if (perm === "x") offset = 2;
                for (const index of indexes) {
                    if (index % 3 === offset) {
                        chars[index] = perm;
                    }
                }
            }
        }
    }
    return chars.join("");
};

window.resolvePath = function(path, depth = 0) {
    if (depth > 20) {return null;}
    const parts = path.replace("~", "").split(ROOT).filter(Boolean);
    let node = window.FileSystem[ROOT];
    let currentPath = ROOT;
    for (const part of parts) {
        if (!node.children || !node.children[part]) {return null;}
        node = node.children[part];
        currentPath = currentPath === ROOT
            ? ROOT + part
            : currentPath + ROOT + part;
        while (node.type === "symlink") {
            const linkTarget = node.target.startsWith(ROOT)
                ? node.target
                : resolveRelativePath(
                    currentPath.substring(0, currentPath.lastIndexOf(ROOT)),
                    node.target
                );
            const result = resolvePath(linkTarget, depth + 1);
            if (!result) {
                return null;
            }
            node = result.node;
            currentPath = result.path;
        }
    }
    return {
        node,
        path: currentPath
    };
};

window.resolveRelativePath = function (cwd, path) {
    function normalizePath(path) {
        const parts = [];
        for (const part of path.split(ROOT)) {
            if (!part || part === ".") {continue;}
            if (part === "..") {
                if (parts.length > 0) {
                    parts.pop();
                }
                continue;
            }
            parts.push(part);
        }
        return ROOT + parts.join(ROOT);
    }
    if (!path || path === ".") {return cwd;}
    if (path === "~") {return HOME;}
    if (path.startsWith("~/")) {path = HOME + path.slice(1);}
    if (path.startsWith(ROOT)) {return normalizePath(path);}
    return normalizePath(`${cwd}/${path}`);
};

window.getParentDirectory = function (path) {
    const parts = path.split(ROOT).filter(Boolean);
    if (parts.length === 0) {return null;}
    const name = parts.pop();
    let parent = window.FileSystem[ROOT];
    for (const part of parts) {
        if (!parent.children || !parent.children[part]) {return null;}
        parent = parent.children[part];
        if (parent.type !== "dir") {return null;}
    }
    return {parent,name};
};

window.formatSize = function(bytes) {
    if (bytes < 1024) {
        return `${bytes}B`;
    }
    const units = ["K", "M", "G", "T"];
    let size = bytes;
    for (const unit of units) {
        size /= 1024;
        if (size < 1024) {
            return `${size.toFixed(1)}${unit}`;
        }
    }
    return `${size.toFixed(1)}P`;
};

window.getDirectorySize = function(node) {
    if (!node) {
        return 0;
    }
    if (node.type === "file") {
        return new TextEncoder().encode(node.content || "").length;
    }
    let total = 0;
    for (const child of Object.values(node.children || {})) {
        total += window.getDirectorySize(child);
    }
    return total;
};

window.getSize = function(node) {
    if (node.type === "file") {
        return new TextEncoder().encode(node.content || "").length;
    }
    if (node.type === "dir") {
        return Object.keys(node.children || {}).length;
    }
    return 0;
};

window.formatDate = function (timestamp) {
    return new Date(timestamp).toLocaleString("en-CA", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
};

window.getLinkCount = function(node) {
    if (node.type === "file") {
        return 1;
    }
    const subdirs = Object.values(node.children || {})
        .filter(child => child.type === "dir")
        .length;
    return 2 + subdirs;
};

window.formatLongEntry = function(name, node) {
    const typeChar = node.type === "dir" ? "d" : node.type === "symlink" ? "l" : "-";
    const mode = node.mode;
    const links = window.getLinkCount(node);
    const group = node.group;
    const size = window.getDirectorySize(node);
    const modified = window.formatDate(node.modified);    const owner = node.owner;
    return `${typeChar}${mode} ${String(links).padStart(2)} ${owner.padEnd(8)} ${group.padEnd(8)} ${String(size).padStart(6)} ${modified} ${name}${node.type === "dir" ? "/" : ""}${node.type === "symlink" ? ` -> ${node.target}` : ""}`;
};

window.createLink = function(target) {
    const now = Date.now();
    return {
        type: "symlink",
        target: target,
        mode: "rwxrwxrwx",
        owner: "guest",
        group: "guest",
        created: now,
        modified: now
    };
};

window.createFile = function(hidden = false) {
    const now = Date.now();
    return {
        type: "file",
        hidden,
        mode: "rw-r--r--",
        owner: "guest",
        group: "guest",
        created: now,
        modified: now,
        accessed: now,
        content: ""
    };
};

window.createDirectory = function(hidden = false) {
    const now = Date.now();
    return {
        type: "dir",
        hidden,
        mode: "rwxr-xr-x",
        owner: "guest",
        group: "guest",
        created: now,
        modified: now,
        accessed: now,
        children: {}
    };
};

window.expandWildcards = function(arg, cwd = "/") {
    if (!arg.includes("*") && !arg.includes("?")) {
        return [arg];
    }
    const results = [];
    const pattern = arg.startsWith("/")
        ? arg
        : resolveRelativePath(cwd, arg);
    const parts = pattern.split("/");

    function walk(node, index, currentPath) {
        if (index >= parts.length) {
            results.push(currentPath || "/");
            return;
        }
        const part = parts[index];
        if (part === "") {
            walk(node, index + 1, currentPath);
            return;
        }
        if (!node || !node.children) {
            return;
        }
        if (part.includes("*") || part.includes("?")) {
            const regex = new RegExp(
                "^" +
                part
                    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
                    .replace(/\*/g, ".*")
                    .replace(/\?/g, ".")
                +
                "$"
            );
            for (const name of Object.keys(node.children)) {
                const child = node.children[name];
                if (regex.test(name)) {
                    walk(
                        child,
                        index + 1,
                        currentPath + "/" + name
                    );
                }
            }
        }
        else {
            const child = node.children[part];
            if (child) {
                walk(
                    child,
                    index + 1,
                    currentPath + "/" + part
                );
            }
        }
    }
    let startNode = window.FileSystem["/"];
    walk(
        startNode,
        0,
        ""
    );
    return results;
};