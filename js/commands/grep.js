registerCommand("grep", {
    name: "Search files for matching text.",
    synopsis : "grep [options] 'pattern' filename",
    description: "Is a powerful command-line utility used to search for specific words, phrases, or regular expression patterns inside text files or command outputs. It prints every line that contains a match to your terminal screen by default.",
    options: [],
    examples: [
        "grep \"error\" log.txt",
        "cat text.txt | grep \"error\""
    ],
    execute(terminal, args, stdin) {
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        const pattern = args[0];
        if (!pattern) {
            return {
                stdout: "",
                stderr: "grep: missing pattern",
                exitCode: 1
            };
        }
        let content = stdin;
        if (!content) {
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