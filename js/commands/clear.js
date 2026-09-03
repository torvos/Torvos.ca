/**
 * `clear` command.
 * Clears the terminal screen (actual clearing happens where this result is consumed; here it just signals success).
 */
registerCommand("clear", {
    name: "Clear the terminal screen.",
    synopsis : "clear",
    description: "Erase all visible terminal output and reposition the cursor at the top of the screen.",
    options: [],
    examples: [
        "clear"
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
        terminal.clearScreen();
        return {
            stdout: "",
            stderr: "",
            exitCode: EXIT_SUCCESS
        };
    }
});