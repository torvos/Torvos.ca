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
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }        
        const target = args[0];
        if(target in terminal.aliases){
            delete terminal.aliases[target];
            return {
                stdout: "",
                stderr: "",
                exitCode: 0
            };
        }
        else{
            return {
                stdout: "",
                stderr: "unalias: alias doesn't exsist",
                exitCode: 1
            };        
        }                 
    }
});