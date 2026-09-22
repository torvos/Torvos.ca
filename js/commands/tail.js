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

        // Array.prototype.slice(-N) is how this picks "the last N lines" -
        // but JS treats slice(-0) exactly the same as slice(0) (there's no
        // such thing as a distinct "negative zero" index), which returns
        // the WHOLE array instead of an empty one. So does slice(NaN) (a
        // non-numeric -n value), since ToIntegerOrInfinity converts NaN to
        // 0 too. Both would make `tail -n 0` (or a bad -n value) print
        // everything instead of nothing.
        //
        // Also drops one trailing empty string, if there is one - content
        // ending in a newline (the normal case for a real text file, and
        // for anything written by echo/printf's own trailing "\n") makes
        // split(/\r?\n/) produce a phantom EXTRA "line" after the real
        // last one (e.g. "a\nb\n".split(...) is ["a","b",""], not ["a","b"]).
        // Left in, that phantom empty entry would count as the actual
        // LAST line for `tail`'s purposes, silently pushing a real line
        // out of the "last N" window (sort/uniq already guard against this
        // same thing for their own purposes - see the matching check
        // there). Route every last-N-lines slice through this instead of
        // calling .slice(-maxDepth) directly.
        function lastNLines(lines) {
            if (lines.length && lines[lines.length - 1] === "") {
                lines = lines.slice(0, -1);
            }
            return Number.isFinite(maxDepth) && maxDepth > 0 ? lines.slice(-maxDepth) : [];
        }

        if (targets.length === 0) {
            // No file given - fall back to piped stdin. `stdin == null` means
            // nothing was piped at all - distinct from stdin being an empty
            // string, which means an empty input WAS piped (e.g. `printf '' | tail`)
            // and should just print nothing rather than error.
            if (stdin == null) {
                return {
                    stdout: "",
                    stderr: "tail: missing file operand",
                    exitCode: EXIT_FAILURE
                };
            }
            return {
                stdout: lastNLines(stdin.split(/\r?\n/)).join("\n"),
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
            const body = lastNLines(terminal.fs.readContent(node).split(/\r?\n/)).join("\n");
            chunks.push(targets.length > 1 ? `==> ${target} <==\n${body}` : body);
        }

        return {
            stdout: chunks.join("\n\n"),
            stderr: errors.join("\n"),
            exitCode: errors.length ? EXIT_FAILURE : EXIT_SUCCESS
        };
    }
});
