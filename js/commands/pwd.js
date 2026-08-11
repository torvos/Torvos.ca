/**
 * `pwd` command.
 * Prints the current working directory.
 */
registerCommand("pwd", {
    name: "Print the current working directory.",
    synopsis : "pwd",
    description: "writes to standard output the full path name of your current directory (from the root directory). All directories are separated by a / (slash).",
    options: [],
    examples: [
        "pwd"
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
        return {
            stdout: terminal.cwd,
            stderr: "",
            exitCode: 0
        };                  
    }
});