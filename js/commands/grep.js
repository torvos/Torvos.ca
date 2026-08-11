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
            content = terminal.fs.get(args[1], terminal.cwd).content;
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
        return {
            stdout: matches.join("\n"),
            stderr: "",
            exitCode: matches.length ? 0 : 1
        };
    }
});
