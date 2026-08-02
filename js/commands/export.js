registerCommand("export", {
    name: "Set or update environment variables.",
    synopsis : "export NAME=VALUE",
    description: "Create or modify an environment variable that will be available to subsequently executed commands.",
    options: [],
    examples: [
        "export EDITOR=vim",
        "export PATH=/bin",
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
        const value = args[1];
        if(target in terminal.env){
            return {
                stdout: "",
                stderr: "export: variable already set",
                exitCode: 1
            };
        }
        else{
            if (value !== null && value !== undefined) {
                terminal.env[target] = value;
                return {
                    stdout: "",
                    stderr: "",
                    exitCode: 0
                };               
            }
            else{
                return {
                    stdout: "",
                    stderr: "export: missing operand",
                    exitCode: 1
                };            
            }
        }
    }
});