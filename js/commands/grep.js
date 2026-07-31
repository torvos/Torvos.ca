registerCommand("", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
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