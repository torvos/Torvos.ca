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
                exitCode: 0
            };                
        }
        const parsed = terminal.parseFlags(args,{n: true});
        const maxDepth = parsed.options?.n !== undefined
            ? parseInt(parsed.options.n, 10)
            : 10;
        const target = parsed.args[0];
        
        let content = "";

        if (!target) {
            // No file given - fall back to piped stdin
            if (!stdin) {
                return {
                    stdout: "",
                    stderr: "tail: missing file operand",
                    exitCode: 1
                };
            }

            content = stdin;

        } else {

            const node = terminal.fs.get(target, terminal.cwd);
            if (!node) {
                return {
                    stdout: "",
                    stderr: `tail: no such file: ${target}`,
                    exitCode: 1
                };
            }

            if (terminal.fs.isDirectory(node)) {
                return {
                    stdout: "",
                    stderr: `tail: ${target}: is a directory`,
                    exitCode: 1
                };
            }

            node.accessed = Date.now();
            content = terminal.fs.readContent(node);
        }


        return {
            stdout: content
                .split(/\r?\n/)
                .slice(-maxDepth) // negative slice = last N lines
                .join("\n"),

            stderr: "",
            exitCode: 0
        };
    }
});
