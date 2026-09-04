/**
 * `head` command.
 * Prints just the first N lines (default 10, or set via -n) of a file
 * or piped stdin.
 */
registerCommand("head", {
    name: "Display the first lines of a file.",
    synopsis : "head [OPTIONS] FILE...",
    description: "is a built-in utility that outputs the first part (by default, the first 10 lines) of one or more text files to the terminal. It is a foundational tool for system administrators and developers to quickly preview large configuration files, logs, or datasets without opening a full text editor.",
    options: [
        "-n #  number of lines to display"
    ],
    examples: [
        "head file.txt",
        "head -n 20 file.txt"
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
                    stderr: "head: missing file operand",
                    exitCode: EXIT_FAILURE
                };
            }
            return {
                stdout: stdin
                    .split(/\r?\n/)
                    .slice(0, maxDepth)
                    .join("\n"),
                stderr: "",
                exitCode: EXIT_SUCCESS
            };
        }

        // With multiple files, real `head` prints a "==> name <==" header
        // above each one's output so they stay distinguishable.
        const chunks = [];
        const errors = [];

        for (const target of targets) {
            const node = terminal.fs.get(target, terminal.cwd);

            if (!node) {
                errors.push(`head: no such file: ${target}`);
                continue;
            }
            if (terminal.fs.isProtected(target, terminal.cwd) && !terminal.fs.isDevice(node)) {
                errors.push(`head: ${target}: Permission denied`);
                continue;
            }
            if (terminal.fs.isDirectory(node)) {
                errors.push(`head: ${target}: is a directory`);
                continue;
            }
            node.accessed = Date.now();
            const body = terminal.fs.readContent(node)
                .split(/\r?\n/)
                .slice(0, maxDepth)
                .join("\n");
            chunks.push(targets.length > 1 ? `==> ${target} <==\n${body}` : body);
        }

        return {
            stdout: chunks.join("\n\n"),
            stderr: errors.join("\n"),
            exitCode: errors.length ? EXIT_FAILURE : EXIT_SUCCESS
        };
    }
});
