/**
 * `mv` command.
 * Moves (or renames) a file/directory node by re-parenting it in the
 * destination's parent's children map and deleting it from the source.
 * Refuses to overwrite an existing destination.
 */
registerCommand("mv", {
    name: "Move or rename files/directories.",
    synopsis : "mv [OPTIONS] SOURCE DESTINATION",
    description: "is a fundamental Linux utility used to move or rename files and directories. Unlike copying, mv permanently alters the source file's location or name without creating a duplicate.",
    // Tells the executor to persist the filesystem after this command
    // runs - see the `mutatesFilesystem` check in execute.js.
    mutatesFilesystem: true,
    options: [],
    examples: [
        "mv resumer.md cv.txt"
    ],
    async execute(terminal, args, stdin) {
        // Print usage info and exit early when --help is passed
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: EXIT_SUCCESS
            };                
        }        
        // Real `mv a b c dest/` supports multiple sources when the last
        // operand is an existing directory, same as `cp` - handled the
        // same way here for consistency.
        const operands = args.filter(a => a !== "--help");

        if (operands.length < 2) {
            return {
                stdout: "",
                stderr: `mv: missing operand`,
                exitCode: EXIT_FAILURE
            };           
        }

        const destination = operands[operands.length - 1];
        const sources = operands.slice(0, -1);

        // Structural (removes the source entry, creates/replaces the
        // destination entry) - always blocked if EITHER end is a
        // protected system path, devices included: neither moving
        // /dev/null out nor moving a file in over it is allowed.
        if (terminal.fs.isProtected(destination, terminal.cwd)) {
            return {
                stdout: "",
                stderr: `mv: cannot move to '${destination}': Permission denied`,
                exitCode: EXIT_FAILURE
            };
        }

        const destNode = terminal.fs.get(destination, terminal.cwd);
        const destIsDir = destNode && terminal.fs.isDirectory(destNode);

        if (sources.length > 1 && !destIsDir) {
            return {
                stdout: "",
                stderr: `mv: target '${destination}' is not a directory`,
                exitCode: EXIT_FAILURE
            };
        }

        // Moves a single source to `destPath`, returning an error message
        // string on failure or null on success.
        function moveOne(source, destPath) {
            if (terminal.fs.isProtected(source, terminal.cwd)) {
                return `mv: cannot move '${source}': Permission denied`;
            }

            const src = terminal.fs.getParent(source, terminal.cwd);
            const dest = terminal.fs.getParent(destPath, terminal.cwd);

            if (!src || !dest) {
                return `mv: invalid path`;
            }

            if (!src.parent.children[src.name]) {
                return `mv: cannot stat '${source}': No such file or directory`;
            }

            const srcNode = src.parent.children[src.name];

            // Refuse to move a directory to a location inside itself (or
            // inside one of its own descendants). Without this check,
            // re-parenting the same live node object into its own subtree
            // below would create a structural cycle (dirA/sub/dirA/sub/...)
            // that any recursive walker (rm -r, find, tree, ...) would
            // recurse into forever - real `mv` rejects this case up front
            // for the same reason.
            if (terminal.fs.isDirectory(srcNode)) {
                const sourceFullPath = terminal.fs.getFullPath(source, terminal.cwd);
                const destFullPath = terminal.fs.getFullPath(destPath, terminal.cwd);
                if (sourceFullPath && destFullPath &&
                    (destFullPath === sourceFullPath ||
                     destFullPath.startsWith(`${sourceFullPath}${ROOT}`))) {
                    return `mv: cannot move '${source}' to a subdirectory of itself, '${destPath}'`;
                }
            }

            if (dest.parent.children[dest.name]) {
                // Destination already exists - refuse rather than silently overwrite
                return `mv: ${destPath}: already exists`;
            }

            src.parent.modified = Date.now();
            dest.parent.modified = Date.now();

            // Re-parent: attach the node under its new name/location...
            dest.parent.children[dest.name] = src.parent.children[src.name];

            // ...then remove it from its old location
            delete src.parent.children[src.name];
            return null;
        }

        const errors = [];
        for (const source of sources) {
            const destPath = destIsDir
                ? `${destination.replace(/\/$/, "")}/${terminal.fs.getParent(source, terminal.cwd)?.name ?? source}`
                : destination;
            const error = moveOne(source, destPath);
            if (error) {
                errors.push(error);
            }
        }

        return {
            stdout: "",
            stderr: errors.join("\n"),
            exitCode: errors.length ? EXIT_FAILURE : EXIT_SUCCESS
        };
    }    
});
