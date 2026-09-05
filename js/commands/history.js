/**
 * `history` command.
 * Prints the shell's recorded command history, one numbered entry per
 * line (e.g. "  1  ls"), matching real `history`'s default output.
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
                exitCode: EXIT_SUCCESS
            };                
        }
        return {
            stdout: terminal.history
                .map((cmd, index) => `  ${index + 1}  ${cmd}`)
                .join("\n"),
            stderr: "",
            exitCode: EXIT_SUCCESS
        };
    }
});