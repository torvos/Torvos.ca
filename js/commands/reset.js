/**
 * `reset` command.
 * Placeholder handler for the `reset` command; the actual reset (wiping localStorage and reloading) is special-cased directly in input.js's handleEnter, so this only handles --help/introspection.
 */
registerCommand("reset", {
    name: "Reset the terminal state.",
    synopsis : "reset",
    description: "reinitializes the terminal back to its default, working state",
    options: [],
    examples: [
        "reset"
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
            stdout: "reset",
            stderr: "",
            exitCode: EXIT_SUCCESS
        };                
    }  
});