/**
 * `tail` command.
 * Prints just the last N lines (default 10, or set via -n) of a file
 * or piped stdin.
 */
registerCommand("tail", {
    name: "Display the last lines of a file.",
    synopsis : "tail [OPTIONS] FILE...",
    description: "is a built-in utility that outputs the last part (by default, the last 10 lines) of one or more text files to the terminal. It is a foundational tool for system administrators and developers to quickly preview large configuration files, logs, or datasets without opening a full text editor.",
    options: [
        "-n #  number of lines to display"
    ],
    examples: [
        "tail file.txt",
        "tail -n 20 file.txt"
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
        const parsed = terminal.parseFlags(args,{n: true});
        const maxDepth = parsed.options?.n !== undefined
            ? parseInt(parsed.options.n, 10)
            : 10;
        const targets = parsed.args;

        if (targets.length === 0) {
            // No file given - fall back to piped stdin
            if (!stdin) {
                return {
                    stdout: "",
                    stderr: "tail: missing file operand",
                    exitCode: EXIT_FAILURE
                };
            }
            return {
                stdout: stdin
                    .split(/\r?\n/)
                    .slice(-maxDepth) // negative slice = last N lines
                    .join("\n"),
                stderr: "",
                exitCode: EXIT_SUCCESS
            };
        }

        // With multiple files, real `tail` prints a "==> name <==" header
        // above each one's output so they stay distinguishable.
        const chunks = [];
        const errors = [];

        for (const target of targets) {
            const node = terminal.fs.get(target, terminal.cwd);
            if (!node) {
                errors.push(`tail: no such file: ${target}`);
                continue;
            }

            if (terminal.fs.isProtected(target, terminal.cwd) && !terminal.fs.isDevice(node)) {
                errors.push(`tail: ${target}: Permission denied`);
                continue;
            }

            if (terminal.fs.isDirectory(node)) {
                errors.push(`tail: ${target}: is a directory`);
                continue;
            }

            node.accessed = Date.now();
            const body = terminal.fs.readContent(node)
                .split(/\r?\n/)
                .slice(-maxDepth)
                .join("\n");
            chunks.push(targets.length > 1 ? `==> ${target} <==\n${body}` : body);
        }

        return {
            stdout: chunks.join("\n\n"),
            stderr: errors.join("\n"),
            exitCode: errors.length ? 1 : 0
        };
    }
});
