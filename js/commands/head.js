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

        // Drops one trailing empty string, if there is one - content
        // ending in a newline (the normal case for a real text file, and
        // for anything written by echo/printf's own trailing "\n") makes
        // split(/\r?\n/) produce a phantom EXTRA "line" after the real
        // last one (e.g. "a\nb\n".split(...) is ["a","b",""], not
        // ["a","b"]). Left in, whenever maxDepth is large enough to reach
        // it (the default -n 10 covers any file of 10 lines or fewer),
        // that phantom entry would get printed as an extra blank line
        // that was never really "line 11" of the file (sort/uniq already
        // guard against this same thing for their own purposes - see the
        // matching check there).
        function firstNLines(lines) {
            if (lines.length && lines[lines.length - 1] === "") {
                lines = lines.slice(0, -1);
            }
            return lines.slice(0, maxDepth);
        }

        if (targets.length === 0) {
            // No file given - fall back to piped stdin. `stdin == null` means
            // nothing was piped at all - distinct from stdin being an empty
            // string, which means an empty input WAS piped (e.g. `printf '' | head`)
            // and should just print nothing rather than error.
            if (stdin == null) {
                return {
                    stdout: "",
                    stderr: "head: missing file operand",
                    exitCode: EXIT_FAILURE
                };
            }
            return {
                stdout: firstNLines(stdin.split(/\r?\n/))
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
            const body = firstNLines(terminal.fs.readContent(node).split(/\r?\n/)).join("\n");
            chunks.push(targets.length > 1 ? `==> ${target} <==\n${body}` : body);
        }

        return {
            stdout: chunks.join("\n\n"),
            stderr: errors.join("\n"),
            exitCode: errors.length ? EXIT_FAILURE : EXIT_SUCCESS
        };
    }
});
