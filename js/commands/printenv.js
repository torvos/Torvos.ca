registerCommand("printenv", {
    name: "Print environment variables.",
    synopsis : "printenv",
    description: "prints the values of all or specific environment variables configured in your active terminal session.",
    options: [],
    examples: [
        "printenv"
    ],
    async execute(terminal, args, stdin) {
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        let listing = "";
        for (const key in terminal.env) {
            if (terminal.env.hasOwnProperty(key)) {
            listing += `${key}: ${terminal.env[key]}\n`;
            }
        }
        
        return {
            stdout: listing.replace(/\r?\n$/, ""),
            stderr: "",
            exitCode: 0
        };        
    }
});