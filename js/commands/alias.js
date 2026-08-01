registerCommand("alias", {
    name: "Create or display command aliases.",
    synopsis : "alias NAME='COMMAND'",
    description: "Create a new command alias or display all currently defined aliases. Aliases substitute one command for another before command execution, allowing shortcuts for frequently used commands.",
    options: [],
    examples: [
        "alias",
        "alias ll='ls -l'",
        "alias grep='grep --color'"
    ],
    execute(terminal, args, stdin) {    
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        const target = args[0];
        const value = args[1];
        if(target in terminal.aliases){
            return {
                stdout: "",
                stderr: "alias: alias already exsists",
                exitCode: 1
            };
        }
        else{
            if (value !== null && value !== undefined) {
                terminal.aliases[target] = value;
                return {
                    stdout: "",
                    stderr: "",
                    exitCode: 0
                };        
            }
            else{
                return {
                    stdout: "",
                    stderr: "alias: missing operand",
                    exitCode: 1
                };            
            }
        }
    }
});        