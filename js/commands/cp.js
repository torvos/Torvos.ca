/**
 * `cp` command.
 * Deep-clones the source file/directory node (via structuredClone, which
 * naturally handles directories recursively since children is a nested
 * plain object) and attaches the clone at the destination, refreshing its
 * timestamps. Refuses to overwrite an existing destination.
 */
registerCommand("cp", {
    name: "Copy files and directories.",
    synopsis : "cp SOURCE... DESTINATION",
    description: "Copy one or more files to another location. Directories may be copied recursively using the recursive option.",
    // Tells the executor to persist the filesystem after this command
    // runs - see the `mutatesFilesystem` check in execute.js.
    mutatesFilesystem: true,
    options: [],
    examples: [
        "cp notes.txt backup.txt",
        "cp *.txt backup/",
        "cp -R Documents Archive"
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
        // -R/-r doesn't need to do anything here - structuredClone() below
        // already recurses through a directory's children automatically -
        // but real `cp -R dir dest` should still be accepted rather than
        // treating "-R" itself as the source path.
        const parsed = terminal.parseFlags(args, { R: false, r: false });
        const operands = parsed.args;

        if (operands.length < 2) {
            return {
                stdout: "",
                stderr: `cp: missing operand`,
                exitCode: EXIT_FAILURE
            };    
        }

        const destination = operands[operands.length - 1];
        const sources = operands.slice(0, -1);

        // Structural (clones a whole node into a new location) - blocked
        // if EITHER end is a protected system path. This is stricter than
        // the read-only commands' device exemption on purpose: cp doesn't
        // go through readContent()/the device's read() handler at all, it
        // structuredClone()s the raw node, so there's no sensible "copy of
        // /dev/null" to produce anyway.
        if (terminal.fs.isProtected(destination, terminal.cwd)) {
            return {
                stdout: "",
                stderr: `cp: cannot copy to '${destination}': Permission denied`,
                exitCode: EXIT_FAILURE
            };
        }

        const destNode = terminal.fs.get(destination, terminal.cwd);
        const destIsDir = destNode && terminal.fs.isDirectory(destNode);

        // Like real `cp a b c dest/`, more than one source only makes
        // sense when the destination is an existing directory to copy
        // each of them into.
        if (sources.length > 1 && !destIsDir) {
            return {
                stdout: "",
                stderr: `cp: target '${destination}' is not a directory`,
                exitCode: EXIT_FAILURE
            };
        }

        // Copies a single source to `destPath`, returning an error
        // message string on failure or null on success.
        function copyOne(source, destPath) {
            if (terminal.fs.isProtected(source, terminal.cwd)) {
                return `cp: cannot copy '${source}': Permission denied`;
            }

            const src = terminal.fs.getParent(source, terminal.cwd);
            const dest = terminal.fs.getParent(destPath, terminal.cwd);

            if (!src || !dest) {
                return `cp: invalid path`;
            }

            if (!src.parent.children[src.name]) {
                return `cp: cannot stat '${source}': No such file or directory`;
            }

            if (dest.parent.children[dest.name]) {
                // Destination already exists - refuse rather than silently overwrite
                return `cp: ${destPath}: already exists`;
            }

            src.parent.modified = Date.now();
            dest.parent.modified = Date.now();

            // Deep clone so the copy is fully independent of the original
            // (structuredClone recurses through `children` for directories)
            const copy = structuredClone(src.parent.children[src.name]);
            const now = Date.now();
            copy.created = now;
            copy.modified = now;
            copy.accessed = now;
            dest.parent.children[dest.name] = copy;
            return null;
        }

        const errors = [];
        for (const source of sources) {
            const destPath = destIsDir
                ? `${destination.replace(/\/$/, "")}/${terminal.fs.getParent(source, terminal.cwd)?.name ?? source}`
                : destination;
            const error = copyOne(source, destPath);
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
