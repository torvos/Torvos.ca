registerCommand("whoami", {
    name: "Display the current username.",
    synopsis : "whoami",
    description: "prints the effective username associated with the current user session.",
    options: [],
    examples: [
        "whoami"
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
            stdout: DEFAULT_USER,
            stderr: "",
            exitCode: 0
        };        
    }
});