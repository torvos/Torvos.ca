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
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }        
        const parsed = terminal.parseFlags(args, {a: false, all: false});
        const displayall = parsed.flags.has("a") || parsed.flags.has("all");
        let command = parsed.args[0];
    
        if (stdin !== undefined && stdin !== null && stdin !== "") {
            command = stdin;
        } else {
            if (parsed.args.length === 0) {
                return {
                    stdout: "",
                    stderr: "which: missing operand",
                    exitCode: 1                
                };
            }
        }

        const path = `/bin/${command}`;

        if (resolvePath(path)) {
            return {
                stdout: path,
                stderr: "",
                exitCode: 0
            };
        } else {
            return {
                stdout: "",
                stderr: `${command}: not found`,
                exitCode: 1
            };
        }
    }
});