registerCommand("unset", {
    name: "Remove shell variables.",
    synopsis : "unset VARIABLE",
    description: "is a built-in shell utility used to completely remove variables and functions from the current shell's memory.",
    options: [],
    examples: [
        "unset PATH",
        "unset HOST"
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
        if(target in terminal.env){
            delete terminal.env[target];
            return {
                stdout: "",
                stderr: "",
                exitCode: 0
            };
        }
        else{
            return {
                stdout: "",
                stderr: "env: variable not set",
                exitCode: 1
            };        
        }
    }
});