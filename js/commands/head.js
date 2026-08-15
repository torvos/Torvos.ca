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
                    stderr: "head: missing file operand",
                    exitCode: 1
                };
            }
            content = stdin;
        } else {
            const node = terminal.fs.get(target, terminal.cwd);

            if (!node) {
                return {
                    stdout: "",
                    stderr: `head: no such file: ${target}`,
                    exitCode: 1
                };
            }
            if (terminal.fs.isDirectory(node)) {
                return {
                    stdout: "",
                    stderr: `head: ${target}: is a directory`,
                    exitCode: 1
                };
            }
            node.accessed = Date.now();
            content = terminal.fs.readContent(node);
        }

        return {
            stdout: content
                .split(/\r?\n/)
                .slice(0,maxDepth)
                .join("\n"),
            stderr: "",
            exitCode: 0
        };
    }
});
