/**
 * Virtual filesystem module for the terminal: path resolution, mode
 * parsing/formatting, node creation, wildcard expansion, and the public
 * window.FileSystemAPI facade built on top of them.
 *
 * Wrapped in an IIFE so `FileSystem` (the actual tree of files/directories)
 * and all the helper functions above stay private; only window.FileSystemAPI
 * is exposed globally.
 *
 * Each node in the tree is a plain object with a `type` of "dir", "file",
 * "symlink", or "device", plus standard Unix-like metadata (mode, owner,
 * group, created/modified/accessed timestamps) and either `children`
 * (for dirs), `content` (for files), or `target` (for symlinks).
 *
 * The default seed tree `FileSystem` starts out as (what a fresh session
 * starts with, and what `reset` restores) lives in filesystem-seed.js -
 * see the comment on `let FileSystem = ...` just below. The /dev/* device
 * file handlers (window.FileDevices) live in their own filedevices.js,
 * since they're fully self-contained and don't need access to the tree.
 */
(function() {
    // Seed data lives in filesystem-seed.js (loaded just before this file)
    // as a temporary global - pull it into our own private `FileSystem`
    // variable and remove the global immediately so nothing outside this
    // closure can reach the raw tree afterward.
    let FileSystem = window.__DEFAULT_FILESYSTEM_SEED__;
    delete window.__DEFAULT_FILESYSTEM_SEED__;

    // Snapshot of the default tree (as JSON) kept around so the filesystem
    // can be restored to factory defaults (via `reset` or a corrupted save).
    const DEFAULT_FILESYSTEM_JSON = JSON.stringify(FileSystem);

    /**
     * Recursively visits every node in `node`'s subtree that carries a
     * `seedVersion` field, calling `visit(node, absolutePath)` for each -
     * used by reconcileSeed() to find the small set of "seed content"
     * files (currently the starter files under /home/guest) without
     * needing a hardcoded list of their paths kept in sync by hand.
     * @param {Object} node
     * @param {string} path - Absolute path of `node` itself.
     * @param {(node: Object, path: string) => void} visit
     */
    function walkSeedNodes(node, path, visit) {
        if (!node) {
            return;
        }
        if (Object.prototype.hasOwnProperty.call(node, "seedVersion")) {
            visit(node, path);
        }
        if (node.children) {
            for (const key of Object.keys(node.children)) {
                walkSeedNodes(
                    node.children[key],
                    path === ROOT ? `${ROOT}${key}` : `${path}${ROOT}${key}`,
                    visit
                );
            }
        }
    }

    /**
     * Walks an absolute path (already normalized, no "." or "..") down from
     * root, resolving through any symlinks encountered along the way.
     * @param {string} path - Absolute path to resolve.
     * @param {number} [depth=0] - Symlink-following recursion depth guard.
     * @returns {{node: Object, path: string}|null} The resolved node and its
     *   final (post-symlink) path, or null if any segment doesn't exist or
     *   symlinks recurse too deep (possible loop).
     */
    function resolvePath(path, depth = 0) {
        if (depth > 20) {return null;} // guards against symlink loops
        const parts = path.replace("~", "").split(ROOT).filter(Boolean);
        let node = FileSystem[ROOT];
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
    }

    /**
     * Resolves a possibly-relative, possibly "~"-prefixed path into a
     * normalized absolute path (no "." or ".." segments), relative to `cwd`.
     * @param {string} cwd - Current working directory (absolute path).
     * @param {string} path - Path to resolve; may be relative, absolute,
     *   ".", "~", or "~/...".
     * @returns {string} Normalized absolute path.
     */
    function resolveRelativePath(cwd, path) {
        // Collapses "." and ".." segments and re-joins into an absolute path
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
    }

    /**
     * Walks `fullPath` (already normalized/absolute) segment by segment
     * from root, returning true as soon as it encounters a node flagged
     * `protected: true` - either root itself, some ancestor directory
     * along the way (e.g. /bin or /dev), or the final node. Stops (and
     * returns false) as soon as a segment doesn't exist, which correctly
     * handles not-yet-created targets too: e.g. for "mkdir /bin/new",
     * the walk reaches the existing, protected "bin" node and returns
     * true immediately, before ever needing "new" to exist.
     * @param {string} fullPath
     * @returns {boolean}
     */
    function isProtectedPath(fullPath) {
        let node = FileSystem[ROOT];
        if (node.protected) return true;
        for (const part of fullPath.split(ROOT).filter(Boolean)) {
            if (!node.children || !node.children[part]) return false;
            node = node.children[part];
            if (node.protected) return true;
        }
        return false;
    }

    /**
     * Finds the parent directory node of an absolute path, without
     * resolving symlinks along the way for the final segment.
     * @param {string} path - Absolute path.
     * @returns {{parent: Object, name: string}|null} The parent directory
     *   node and the final path segment's name, or null if any ancestor
     *   directory doesn't exist.
     */
    function getParentDirectory(path) {
        const parts = path.split(ROOT).filter(Boolean);
        if (parts.length === 0) {return null;}
        const name = parts.pop();
        let parent = FileSystem[ROOT];
        for (const part of parts) {
            if (!parent.children || !parent.children[part]) {return null;}
            parent = parent.children[part];
            if (parent.type !== "dir") {return null;}
        }
        return {parent,name};
    }

    /**
     * Converts a numeric permission string (e.g. "755") into the symbolic
     * "rwxr-xr-x" form used for display/storage.
     * @param {string} value - Numeric mode, e.g. "0755" or "755".
     * @returns {string} 9-character symbolic permission string.
     */
    function numericToMode(value) {
        value = value.slice(-3); // only the last 3 digits (owner/group/other) matter
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
    }

    /**
     * Applies a chmod-style symbolic permission change (e.g. "u+x", "go-w",
     * "a=rw") to an existing 9-character mode string, as used by the
     * `chmod` command.
     * @param {string} current - Existing 9-char symbolic mode string.
     * @param {string} operation - Symbolic operation, matching /^([ugoa]+)([+-=])([rwx]+)$/.
     * @returns {string} The updated 9-character mode string (unchanged if
     *   `operation` doesn't match the expected pattern).
     */
    function symbolicToMode(current, operation) {
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
    }

    /**
     * Formats a byte count into a human-readable size string with a
     * K/M/G/T/P unit suffix (e.g. `ls -h`, `df`, `du`-style output).
     */
    function formatSize(bytes) {
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
    }

    /**
     * Recursively computes the total size in bytes of a node: for a file,
     * its UTF-8 encoded content length; for a directory, the sum of all
     * descendant files.
     */
    function getDirectorySize(node) {
        if (!node) {
            return 0;
        }
        if (node.type === "file") {
            return new TextEncoder().encode(node.content || "").length;
        }
        let total = 0;
        for (const child of Object.values(node.children || {})) {
            total += getDirectorySize(child);
        }
        return total;
    }

    /**
     * Returns a node's "size" for `ls -l`-style display purposes: byte
     * length for files, or immediate child count for directories (not
     * recursive, unlike getDirectorySize).
     */
    function getSize(node) {
        if (node.type === "file") {
            return new TextEncoder().encode(node.content || "").length;
        }
        if (node.type === "dir") {
            return Object.keys(node.children || {}).length;
        }
        return 0;
    }

    // Formats a timestamp for `ls -l`-style display (e.g. "Jul 01, 10:00").
    function formatDate(timestamp) {
        return new Date(timestamp).toLocaleString("en-CA", {
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });
    }

    /**
     * Computes the "link count" column shown by `ls -l`. Files always
     * report 1; directories mimic Unix's convention of 2 (for "." and its
     * own entry in the parent) plus one for each immediate subdirectory
     * (each of which has a ".." pointing back).
     */
    function getLinkCount(node) {
        if (node.type === "file") {
            return 1;
        }
        const subdirs = Object.values(node.children || {})
            .filter(child => child.type === "dir")
            .length;
        return 2 + subdirs;
    }

    /**
     * Formats a single filesystem entry as an `ls -l` long-format line:
     * type+permissions, link count, owner, group, size, modified date, name
     * (with a trailing "/" for dirs, or "-> target" for symlinks).
     */
    function formatLongEntry(name, node) {
        const typeChar = node.type === "dir" ? "d" : node.type === "symlink" ? "l" : node.type === "device" ? "c" : "-";
        const mode = node.mode;
        const links = getLinkCount(node);
        const group = node.group;
        const size = getDirectorySize(node);
        const modified = formatDate(node.modified);    const owner = node.owner;
        return `${typeChar}${mode} ${String(links).padStart(2)} ${owner.padEnd(8)} ${group.padEnd(8)} ${String(size).padStart(6)} ${modified} ${name}${node.type === "dir" ? "/" : ""}${node.type === "symlink" ? ` -> ${node.target}` : ""}`;
    }

    // Creates a new symlink node pointing at `target` (used by `ln -s`).
    function createLink(target) {
        const now = Date.now();
        return {
            type: "symlink",
            target: target,
            mode: "rwxrwxrwx",
            owner: DEFAULT_USER,
            group: DEFAULT_USER,
            created: now,
            modified: now
        };
    }

    // Creates a new empty file node with default owner/permissions
    // (used by `touch`, redirection, etc).
    function createFile(hidden = false) {
        const now = Date.now();
        return {
            type: "file",
            hidden,
            mode: "rw-r--r--",
            owner: DEFAULT_USER,
            group: DEFAULT_USER,
            created: now,
            modified: now,
            accessed: now,
            content: ""
        };
    }

    // Creates a new empty directory node with default owner/permissions
    // (used by `mkdir`).
    function createDirectory(hidden = false) {
        const now = Date.now();
        return {
            type: "dir",
            hidden,
            mode: "rwxr-xr-x",
            owner: DEFAULT_USER,
            group: DEFAULT_USER,
            created: now,
            modified: now,
            accessed: now,
            children: {}
        };
    }

    /**
     * Expands a glob-style argument containing "*" and/or "?" wildcards
     * into all matching absolute paths in the filesystem, walking segment
     * by segment (so wildcards can appear in any path component, not just
     * the final one, e.g. "/home/*\/*.txt").
     * @param {string} arg - The raw argument, possibly containing wildcards.
     * @param {string} [cwd="/"] - Current working directory for relative resolution.
     * @returns {string[]} All matching paths. If `arg` contains no
     *   wildcard characters at all, it's returned unchanged as a single-
     *   element array (`[arg]`) - there's nothing to expand. An empty
     *   array specifically means `arg` DID look like a glob but matched
     *   nothing; callers (see execute.js, sh.js) treat that case as "fall
     *   back to the literal pattern", matching a real shell's default
     *   behavior for an unmatched glob.
     */
    function expandWildcards(arg, cwd = "/") {
        if (!arg.includes("*") && !arg.includes("?")) {
            return [arg];
        }
        const results = [];
        const pattern = arg.startsWith("/")
            ? arg
            : resolveRelativePath(cwd, arg);
        const parts = pattern.split("/");

        // Recursively walks the tree one path segment at a time, matching
        // literal segments exactly and wildcard segments via regex.
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
                // A bare "*"/"?" pattern shouldn't match hidden dotfiles -
                // real shells only do that if the pattern itself starts
                // with a literal "." (bash's `dotglob` is off by default).
                // Without this, something like `rm *` would silently sweep
                // up .script.sh along with everything else, which is both
                // surprising and not how any real shell behaves.
                const matchesHidden = part.startsWith(".");
                for (const name of Object.keys(node.children)) {
                    if (!matchesHidden && name.startsWith(".")) {
                        continue;
                    }
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
        let startNode = FileSystem[ROOT];
        walk(
            startNode,
            0,
            ""
        );
        return results;
    }

    /**
     * Public filesystem API exposed globally. All path-taking methods
     * accept relative or absolute paths (resolved against `cwd`) unless
     * noted otherwise. Commands (js/commands/*.js) interact with the
     * virtual filesystem exclusively through this object.
     */
    window.FileSystemAPI = {

        // Returns the resolved node at `path` (following symlinks), or null if not found.
        get(path, cwd = "/") {
            const fullPath = resolveRelativePath(cwd, path);
            const result = resolvePath(fullPath);

            if (!result || !result.node) {
                return null;
            }

            return result.node;
        },    

        // Normalizes `path` (relative or absolute) into an absolute path string.
        getFullPath(path, cwd = "/") {
            const fullPath = resolveRelativePath(cwd, path);
            if (!fullPath) {
                return null;
            }
            return fullPath;
        },

        /**
         * True if `path` (or any ancestor directory containing it) is
         * flagged as a protected system location - currently /bin and
         * /dev, see bootstrap.js, which mounts each with `protected: true`.
         *
         * This intentionally isn't a hardcoded path-prefix check (that
         * was the old isInBin(), which only ever covered "/bin/" and
         * quietly left /dev completely unprotected). Protection now lives
         * as data on the node itself, so any future protected directory
         * just needs that one flag set when it's created/mounted, and
         * everything nested under it - including things added to it
         * later - is automatically covered without touching every
         * command in js/commands/ again.
         *
         * Callers that want files under a protected directory to remain
         * genuinely usable (e.g. /dev/null, /dev/random) rather than
         * fully locked away should combine this with isDevice(): block
         * when isProtected() is true AND the node ISN'T a device, so
         * reading/writing a device's simulated content still works
         * exactly as designed, while renaming/deleting/chmod'ing it (or
         * creating brand-new entries in /bin or /dev) stays blocked.
         *
         * Known limitation (shared with the old isInBin()): this checks
         * the path as typed, without following intermediate symlinks -
         * a symlink INTO a protected directory isn't itself caught here.
         * @param {string} path
         * @param {string} [cwd="/"]
         * @returns {boolean}
         */
        isProtected(path, cwd = "/") {
            const fullPath = resolveRelativePath(cwd, path);
            return isProtectedPath(fullPath);
        },

        // Accepts either a path string or an already-resolved node.
        isDirectory(pathOrNode, cwd = "/") {
            const node = typeof pathOrNode === "string"
                ? this.get(pathOrNode, cwd)
                : pathOrNode;

            return node?.type === "dir";
        },

        // Accepts either a path string or an already-resolved node.
        isFile(pathOrNode, cwd = "/") {
            const node = typeof pathOrNode === "string"
                ? this.get(pathOrNode, cwd)
                : pathOrNode;

            return node?.type === "file";
        },

        // Accepts either a path string or an already-resolved node. Note:
        // since get() already follows symlinks, this is mainly useful when
        // passed an already-fetched raw node (e.g. from getNode()).
        isSymlink(pathOrNode, cwd = "/") {
            const node = typeof pathOrNode === "string"
                ? this.get(pathOrNode, cwd)
                : pathOrNode;

            return node?.type === "symlink";
        },

        // Accepts either a path string or an already-resolved node. True for
        // the virtual device files under /dev (null, zero, random, etc).
        isDevice(pathOrNode, cwd = "/") {
            const node = typeof pathOrNode === "string"
                ? this.get(pathOrNode, cwd)
                : pathOrNode;

            return node?.type === "device";
        },

        /**
         * Returns the readable content of a file OR device node. Regular
         * files return their stored `content` as usual; device nodes (e.g.
         * /dev/random) delegate to that device's read() handler in
         * window.FileDevices, generating their content on the fly instead
         * of reading a static string. This is the one method every command
         * should use to read a file's bytes, so device files "just work"
         * anywhere a regular file would.
         * @param {string|Object} pathOrNode - Path string or resolved node.
         * @param {string} [cwd] - Working directory to resolve a path against.
         * @returns {string} The content, or "" if the node/device is missing.
         */
        readContent(pathOrNode, cwd = "/") {
            const node = typeof pathOrNode === "string"
                ? this.get(pathOrNode, cwd)
                : pathOrNode;

            if (!node) return "";

            if (node.type === "device") {
                const device = window.FileDevices?.[node.device];
                return device ? device.read() : "";
            }

            return node.content ?? "";
        },

        /**
         * Writes (or appends) content to a file OR device node. Regular
         * files store the text in `content` as usual; device nodes delegate
         * to that device's write() handler in window.FileDevices (which may
         * discard the data, as /dev/null does, or refuse it, as /dev/full
         * does) rather than actually storing it.
         * @param {string|Object} pathOrNode - Path string or resolved node.
         * @param {string} data - Text to write.
         * @param {Object} [options]
         * @param {boolean} [options.append=false] - Append instead of overwrite (files only).
         * @param {string} [options.cwd="/"] - Working directory, when pathOrNode is a path string.
         * @returns {boolean} true on success, false if the node is missing
         *   or the device refused the write (e.g. /dev/full).
         */
        writeContent(pathOrNode, data, options = {}) {
            const node = typeof pathOrNode === "string"
                ? this.get(pathOrNode, options.cwd ?? "/")
                : pathOrNode;

            if (!node) return false;

            if (node.type === "device") {
                const device = window.FileDevices?.[node.device];
                const ok = device ? device.write(data ?? "") : false;
                if (ok) node.modified = Date.now();
                return ok;
            }

            node.content = options.append
                ? ((node.content ?? "")
                    ? node.content + "\n" + (data ?? "")
                    : (data ?? ""))
                : (data ?? "");
            node.modified = Date.now();
            return true;
        },

        // Resolves `path` and returns the full {node, path} result (symlinks followed).
        resolve(path, cwd = "/") {
            const fullPath = resolveRelativePath(cwd, path);
            return resolvePath(fullPath);
        },
        
        // Returns {parent, name} for the parent directory node/basename of `path`.
        getParent(path, cwd = "/") {
            const fullPath = resolveRelativePath(cwd, path);
            return getParentDirectory(fullPath);
        },

        createFile(hidden = false) {
            return createFile(hidden);
        },

        createDirectory(hidden = false) {
            return createDirectory(hidden);
        },

        createLink(target) {
            return createLink(target);
        },

        getDirectorySize(node) {
            return getDirectorySize(node);
        },

        getSize(node) {
            return getSize(node);
        },

        getLinkCount(node) {
            return getLinkCount(node);
        },

        formatLongEntry(name, node) {
            return formatLongEntry(name, node);
        },

        formatDate(timestamp) {
            return formatDate(timestamp);
        },

        formatSize(bytes) {
            return formatSize(bytes);
        },

        numericToMode(value) {
            return numericToMode(value);
        },

        symbolicToMode(current, operation) {
            return symbolicToMode(current, operation);
        },

        expandWildcards(arg, cwd = "/") {
            return expandWildcards(arg, cwd);
        },
        
        // Looks up a node by absolute (or cwd-relative-to-root) path WITHOUT
        // following symlinks - returns the raw node as stored in the tree.
        getNode(path) {
            if (!path.startsWith(ROOT))
                path = resolveRelativePath(ROOT, path);

            let node = FileSystem[ROOT];
            const parts = path.split(ROOT).filter(Boolean);

            for (const part of parts) {
                if (!node.children || !node.children[part]) {
                    return null;
                }
                node = node.children[part];
            }
            return node;
        },

        // Attaches `node` as a new top-level child of root under `name`
        // (used by bootstrap.js to mount /bin and /dev).
        mount(name, node) {
            FileSystem[ROOT].children[name] = node;
        },

        // Serializes the entire filesystem tree to a JSON string (for localStorage).
        serialize() {
            return JSON.stringify(FileSystem);
        },

        /**
         * Replaces the in-memory filesystem with the parsed contents of
         * `json` (a previously-serialized tree). Falls back to the default
         * filesystem if parsing fails.
         * @returns {boolean} true if restore succeeded, false if the JSON
         *   was invalid and defaults were used instead.
         */
        restore(json) {
            try {
                FileSystem = JSON.parse(json);
                return true;
            } catch (e) {
                FileSystem = JSON.parse(DEFAULT_FILESYSTEM_JSON);
                return false;
            }
        },

        // Discards all changes and restores the original seed filesystem (used by `reset`).
        resetToDefault() {
            FileSystem = JSON.parse(DEFAULT_FILESYSTEM_JSON);
        },

        /**
         * Brings the small set of "seed content" files (currently the
         * starter files under /home/guest - resume.md, contact.md, etc.)
         * up to date with whatever the CURRENT code ships, without
         * touching anything else the user has created, moved, or edited
         * elsewhere in their filesystem.
         *
         * This replaces the old approach of wiping localStorage entirely
         * whenever TERMINAL_VERSION changed: that was a blunt instrument
         * for what's really a narrow problem ("I fixed a typo in
         * readme.md, existing users should get the fix") and it cost
         * users everything else they'd done in their session to deliver
         * it. Instead, each seed file carries its own `seedVersion` in
         * filesystem.js, bumped by hand only when that file's *content*
         * changes, and this reconciles against it, version by version:
         *
         *   - Locally at or past the shipped seedVersion already -> left
         *     alone completely (this is the common case on every boot).
         *   - Locally behind the shipped seedVersion (whether because the
         *     file is missing, was deleted, or was edited - reconcileSeed
         *     doesn't distinguish those, on purpose) -> replaced outright
         *     with the shipped content. These four files are meant to
         *     always reflect what ships in the code once you bump their
         *     version, not a permanent user sandbox - if you want a file
         *     users can edit and keep, don't give it a `seedVersion`.
         *
         * @param {Object.<string, number>} seedSync - Map of seed file
         *   path -> the last seedVersion reconciled for it, persisted in
         *   terminalSettings across reloads. Pass {} for a first run.
         * @returns {{seedSync: Object.<string, number>, changes: {path: string, action: "added"|"updated"}[]}}
         *   The updated map to persist back, plus a list of what changed
         *   (so the caller can let the user know, if it wants to).
         */
        reconcileSeed(seedSync = {}) {
            const updatedSync = { ...seedSync };
            const changes = [];
            const freshTree = JSON.parse(DEFAULT_FILESYSTEM_JSON);

            walkSeedNodes(freshTree[ROOT], ROOT, (freshNode, path) => {
                const result = getParentDirectory(path);
                if (!result) {
                    return; // shouldn't happen for a well-formed seed path
                }
                const { parent, name } = result;
                const localNode = parent.children[name];
                const lastSynced = updatedSync[path];

                if (localNode && lastSynced === undefined) {
                    // First time this path has ever been reconciled (e.g.
                    // a profile created before this feature existed, or a
                    // brand new profile) - there's nothing to "update" to,
                    // the file already reflects whatever the code shipped
                    // when it was created. Just establish the baseline so
                    // future version bumps have something to compare
                    // against, without firing a spurious change here.
                    updatedSync[path] = freshNode.seedVersion;
                    return;
                }

                if (localNode && lastSynced >= freshNode.seedVersion) {
                    // Already at (or past) the shipped version - nothing to do.
                    return;
                }

                // Missing, or behind the shipped version - (re)write it
                // from the fresh seed content, regardless of whether it's
                // missing because it was never here, was deleted, or was
                // edited. structuredClone since it'll be mutated in-place
                // going forward (accessed/modified timestamps etc.) and
                // shouldn't share references with freshTree.
                const isNew = !localNode;
                parent.children[name] = structuredClone(freshNode);
                parent.modified = Date.now();
                updatedSync[path] = freshNode.seedVersion;
                changes.push({ path, action: isNew ? "added" : "updated" });
            });

            return { seedSync: updatedSync, changes };
        }

    };
})();
