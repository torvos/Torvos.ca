/**
 * `grep` command.
 * Filters lines from stdin (piped input) or a named file, keeping only
 * lines that contain the given literal pattern (substring match, not a
 * full regex). Exits non-zero if no lines matched, like real grep.
 */
registerCommand("grep", {
    name: "Search files for matching text.",
    synopsis : "grep [options] 'pattern' filename",
    description: "Is a powerful command-line utility used to search for specific words, phrases, or regular expression patterns inside text files or command outputs. It prints every line that contains a match to your terminal screen by default.",
    options: [],
    examples: [
        "grep \"error\" log.txt",
        "cat text.txt | grep \"error\""
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
        const pattern = args[0];

        let content = "";

        if (!pattern) {
            return {
                stdout: "",
                stderr: "grep: missing pattern",
                exitCode: 1
            };
        }

        // Prefer piped stdin; otherwise read the named file argument
        if (stdin.length != 0) {
            content = stdin;
        }
        else if (args.length === 2) {
            const node = terminal.fs.get(args[1], terminal.cwd);
            if (!node) {
                return {
                    stdout: "",
                    stderr: `grep: ${args[1]}: No such file or directory`,
                    exitCode: 1
                };
            }
            content = terminal.fs.readContent(node);
        }
        if (content.length === 0){
            return {
                stdout: "",
                stderr: "grep: no input",
                exitCode: 1
            };
        }
        const lines = content.split(/\r?\n/);
        const matches = lines.filter(line =>
            line.includes(pattern)
        );

        // Highlight every occurrence of `pattern` within a matched line,
        // leaving the rest of the line in the default terminal color -
        // same idea as `grep --color`.
        function highlightLine(line) {
            const segments = [];
            let rest = line;
            let idx;
            while ((idx = rest.indexOf(pattern)) !== -1) {
                if (idx > 0) {
                    segments.push({ text: rest.slice(0, idx), color: COLOR_STDOUT });
                }
                segments.push({ text: rest.slice(idx, idx + pattern.length), color: COLOR_MATCH });
                rest = rest.slice(idx + pattern.length);
            }
            if (rest) {
                segments.push({ text: rest, color: COLOR_STDOUT });
            }
            return segments;
        }

        return {
            stdout: matches.join("\n"),
            stdoutSegments: matches.map(highlightLine),
            stderr: "",
            exitCode: matches.length ? 0 : 1
        };
    }
});
