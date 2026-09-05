/**
 * `which` command.
 * Reports the /bin path a given command name resolves to, if it's a
 * registered command (every command is virtually "installed" in /bin
 * by bootstrap.js's createVirtualBin).
 */
registerCommand("which", {
    name: "Locate a command.",
    synopsis : "which [OPTIONS] COMMAND",
    description: "is a utility used to locate the full file path of an executable binary that runs when you type a command into your terminal.",
    options: [
        "-a.   display all matching commands"
    ],
    examples: [
        "which ls",
        "which -a cd"
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
        const parsed = terminal.parseFlags(args, {a: false, all: false});
        const displayall = parsed.flags.has("a") || parsed.flags.has("all");
        let command = parsed.args[0];
    
        // Allow the command name to come from piped stdin if no arg was given
        // - trimmed, since piped output (e.g. from echo) normally carries
        // a trailing newline that isn't part of the actual command name.
        if (stdin !== undefined && stdin !== null && stdin !== "") {
            command = stdin.trim();
        } else {
            if (parsed.args.length === 0) {
                return {
                    stdout: "",
                    stderr: "which: missing operand",
                    exitCode: EXIT_FAILURE                
                };
            }
        }

        const path = `/bin/${command}`;

        if (terminal.fs.get(path)) {
            return {
                stdout: path,
                stderr: "",
                exitCode: EXIT_SUCCESS
            };
        } else {
            return {
                stdout: "",
                stderr: `${command}: not found`,
                exitCode: EXIT_FAILURE
            };
        }
    }
});
