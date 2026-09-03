/**
 * `ps` command.
 * Simulated process listing, disabled for the guest account.
 */
registerCommand("ps", {
    name: "Display running processes.",
    synopsis : "ps",
    description: "is a built-in utility used to view a static snapshot of all currently running processes on your system.",
    options: [],
    examples: [
        "ps"
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
            stderr: "guest users are not permitted to list processes.",
            exitCode: EXIT_FAILURE
        };
    }
});