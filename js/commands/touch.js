/**
 * `touch` command.
 * If the target already exists, updates its modified/accessed timestamps.
 * Otherwise, creates a new empty file in the target's parent directory
 * (auto-marking it hidden if the name starts with ".").
 */
registerCommand("touch", {
    name: "Create files or update timestamps.",
    synopsis : "touch [FILE]",
    description: "is primarily used to create empty files and update file timestamps (access time and modification time).",
    // Tells the executor to persist the filesystem after this command
    // runs - see the `mutatesFilesystem` check in execute.js.
    mutatesFilesystem: true,
    options: [],
    examples: [
        "touch myfile.txt"
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
        const targets = args.filter(a => a !== "--help");

        if (targets.length === 0) {
            return {
                stdout: "",
                stderr: `touch: missing operand`,
                exitCode: EXIT_FAILURE
            };           
        }

        // Touches a single target, returning an error message string on
        // failure or null on success.
        function touchOne(target) {
            // Structural (creates an entry, or bumps an existing one's
            // timestamps) - always blocked for protected system paths.
            if (terminal.fs.isProtected(target, terminal.cwd)) {
                return `touch: cannot touch '${target}': Permission denied`;
            }

            const node = terminal.fs.get(target, terminal.cwd);
            if (node) {
                // File/dir already exists - just bump its timestamps
                node.modified = Date.now();
                node.accessed = Date.now();
                return null;
            }

            // Doesn't exist yet - find its parent directory to create it in
            const result = terminal.fs.getParent(target, terminal.cwd);

            if (!result) {
                return `touch: invalid path ${target}`;
            }

            result.parent.modified = Date.now();
            result.parent.children[result.name] = terminal.fs.createFile(result.name.startsWith("."));
            return null;
        }

        const errors = [];
        for (const target of targets) {
            const error = touchOne(target);
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
