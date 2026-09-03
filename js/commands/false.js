/**
 * `false` command.
 * Always exits with a non-zero status (standard Unix `false`), useful in scripts/tests.
 */
registerCommand("false", {
    name: "Do nothing, unsuccessfully.",
    synopsis : "false",
    description: "Return an unsuccessful (non-zero) exit code without doing anything else. The counterpart to 'true', useful for testing conditionals and loops.",
    options: [],
    examples: [
        "false",
        "if false; then echo yes; else echo no; fi"
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
            stdout: "",
            stderr: "",
            exitCode: EXIT_FAILURE
        };
    }
});
