registerCommand("echo", {
    name: "Display text or expanded variables.",
    synopsis : "echo [TEXT...]",
    description: "Write the supplied text to standard output after performing shell expansions such as variables, wildcards, or command substitution where supported.",
    options: [],
    examples: [
        "echo Hello",
        "echo $HOME"
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
            stdout: args.join(" "),
            stderr: "",
            exitCode: 0
        };
    }
});