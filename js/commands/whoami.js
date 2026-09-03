/**
 * `whoami` command.
 * Prints the current username.
 */
registerCommand("whoami", {
    name: "Display the current username.",
    synopsis : "whoami",
    description: "prints the effective username associated with the current user session.",
    options: [],
    examples: [
        "whoami"
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
            stdout: DEFAULT_USER,
            stderr: "",
            exitCode: EXIT_SUCCESS
        };        
    }
});