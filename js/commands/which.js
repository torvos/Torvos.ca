registerCommand("which", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {    
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