registerCommand("true", {
    name: "Do nothing, successfully.",
    synopsis : "true",
    description: "Return a successful (zero) exit code without doing anything else. Commonly used in scripts as an unconditional loop condition, e.g. 'while true; do ... done'.",
    options: [],
    examples: [
        "true",
        "while true; do echo tick; break; done"
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
            exitCode: 0
        };
    }
});
