/**
 * `history` command.
 * Prints the shell's recorded command history, one entry per line.
 */
registerCommand("history", {
    name: "Display command history",
    synopsis : "history",
    description: "is a shell built-in utility that displays and manages a numbered list of previously executed commands. It helps you recall complex syntax, audit past actions, and re-run commands quickly without retyping them.",
    options: [],
    examples: [
        "history"
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
        return {
            stdout: terminal.history.join("\n"),
            stderr: "",
            exitCode: 0
        };
    }
});