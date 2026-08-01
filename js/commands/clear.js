registerCommand("clear", {
    name: "Clear the terminal screen.",
    synopsis : "clear",
    description: "Erase all visible terminal output and reposition the cursor at the top of the screen.",
    options: [],
    examples: [
        "clear"
    ],
    execute(terminal, args, stdin) {
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        terminal.clearScreen();
        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };
    }
});