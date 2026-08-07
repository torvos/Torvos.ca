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
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };
        }
        return {
            stdout: "",
            stderr: "",
            exitCode: 1
        };
    }
});
