/**
 * Node-construction and generic tree-walking utilities: factories for new
 * file/directory/symlink nodes (used by touch, mkdir, ln -s, redirection,
 * etc.), and a walker that visits every node in a subtree carrying a
 * `seedVersion` field (used by fileapi.js's reconcileSeed() to find seed
 * content without a hardcoded list of paths).
 *
 * None of these touch fileapi.js's private FileSystem variable - the
 * factories just build a new plain object, and the walker takes whatever
 * node it's given as a parameter - so, like mode.js and format.js, this
 * is loaded as a temporary global that fileapi.js consumes and deletes
 * immediately; see the matching comment there.
 */
window.__FS_NODE_HELPERS__ = (function() {

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

    return { walkSeedNodes, createLink, createFile, createDirectory };
})();
