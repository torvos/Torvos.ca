registerCommand("ps", {
    name: "Display running processes.",
    synopsis : "ps",
    description: "is a built-in utility used to view a static snapshot of all currently running processes on your system.",
    options: [],
    examples: [
        "ps"
    ],
    execute(terminal, args, stdin) {
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        return {
            stdout: "",
            stderr: "guest users are not permitted to list processes.",
            exitCode: 1
        };
    }
});