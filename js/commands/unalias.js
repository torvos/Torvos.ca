/**
 * `unalias` command.
 * Removes a previously defined alias from terminal.aliases by name.
 */
registerCommand("unalias", {
    name: "Remove command aliases.",
    synopsis : "alias NAME",
    description: "Removes the command alias. Aliases substitute one command for another before command execution, allowing shortcuts for frequently used commands.",
    options: [],
    examples: [
        "unalias ll",
        "unalias cd.."
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
        const target = args[0];
        if(target in terminal.aliases){
            delete terminal.aliases[target];
            return {
                stdout: "",
                stderr: "",
                exitCode: EXIT_SUCCESS
            };
        }
        else{
            // No alias registered under that name
            return {
                stdout: "",
                stderr: "unalias: alias doesn't exist",
                exitCode: EXIT_FAILURE
            };        
        }                 
    }
});
