/**
 * `printenv` command.
 * Prints every environment variable currently set in the terminal session,
 * one "KEY: value" pair per line.
 */
registerCommand("printenv", {
    name: "Print environment variables.",
    synopsis : "printenv",
    description: "prints the values of all or specific environment variables configured in your active terminal session.",
    options: [],
    examples: [
        "printenv"
    ],
    async execute(terminal, args, stdin) {
        // Print usage info and exit early when --help is passed
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        // Build a "KEY: value" line for every env var
        let listing = "";
        for (const key in terminal.env) {
            if (terminal.env.hasOwnProperty(key)) {
            listing += `${key}: ${terminal.env[key]}\n`;
            }
        }
        
        return {
            stdout: listing.replace(/\r?\n$/, ""), // strip the trailing newline
            stderr: "",
            exitCode: 0
        };        
    }
});
