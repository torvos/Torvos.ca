/**
 * `mkdir` command.
 * Creates a new directory. Without -p, requires the immediate parent to
 * already exist and fails if the target already exists. With -p, creates
 * every missing directory along the path (like `mkdir -p a/b/c`).
 */
registerCommand("mkdir", {
    name: "Create directories.",
    synopsis : "mkdir [OPTIONS] DIRECTORY",
    description: "is used to create one or more new folders inside your file system.",
    // Tells the executor to persist the filesystem after this command
    // runs - see the `mutatesFilesystem` check in execute.js.
    mutatesFilesystem: true,
    options: [
        "-p    create all directorys in a chain"
    ],
    examples: [
        "mkdir test",
        "mkdir -p /test1/test2/test3"
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
        const parsed = terminal.parseFlags(args, { p: false });
        const parents = parsed.flags.has("p");
        const targets = parsed.args;

        if (targets.length === 0) {
            return {
                stdout: "",
                stderr: "mkdir: missing operand",
                exitCode: EXIT_FAILURE
            };        

        }

        // Walks the path segment by segment, creating any directory that
        // doesn't already exist yet (used for `mkdir -p`).
        function mkdirRecursive(path) {
            const parts = path.split(ROOT).filter(Boolean);
            let currentPath = "";

            for (const part of parts) {
                currentPath += ROOT + part;

                const node = terminal.fs.get(currentPath, terminal.cwd);

                if (node) {
                    if (!terminal.fs.isDirectory(node)) {
                        // A path segment already exists but isn't a directory - can't proceed
                        return `mkdir: ${part}: Not a directory`;
                    }
                    continue; // already a directory - move on to the next segment
                }

                const result = terminal.fs.getParent(currentPath, terminal.cwd);

                if (!result) {
                    return `mkdir: invalid path ${currentPath}`;
                }
                result.parent.modified = Date.now();
                result.parent.children[result.name] = terminal.fs.createDirectory(result.name.startsWith("."));
            }

            return null;
        }

        // Creates a single target directory, returning an error message
        // string on failure or null on success.
        function mkdirOne(target) {
            const path = terminal.fs.getFullPath(target, terminal.cwd);

            if (terminal.fs.isProtected(path, terminal.cwd)) {
                return `mkdir: cannot create directory '${target}': Permission denied`;
            }

            if (parents) {
                return mkdirRecursive(path);
            }

            if (terminal.fs.get(path, terminal.cwd)) {
                // Without -p, an existing target is an error
                return `mkdir: directory ${target} already exists`;
            }

            const result = terminal.fs.getParent(path, terminal.cwd);

            if (!result) {
                // Immediate parent directory doesn't exist and -p wasn't given
                return `mkdir: cannot create directory '${target}': No such file or directory`;
            }

            result.parent.modified = Date.now();
            result.parent.children[result.name] = terminal.fs.createDirectory(result.name.startsWith("."));
            return null;
        }

        // Like real `mkdir a b c`, every target is attempted even if an
        // earlier one fails - errors accumulate rather than aborting early.
        const errors = [];
        for (const target of targets) {
            const error = mkdirOne(target);
            if (error) {
                errors.push(error);
            }
        }

        return {
            stdout: "",
            stderr: errors.join("\n"),
            exitCode: errors.length ? 1 : 0
        };
    }
});
