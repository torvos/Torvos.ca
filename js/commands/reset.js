registerCommand("reset", {
    name: "Reset the terminal state.",
    synopsis : "reset",
    description: "reinitializes the terminal back to its default, working state",
    options: [],
    examples: [
        "reset"
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
            stdout: "reset",
            stderr: "",
            exitCode: 0
        };                
    }  
});