registerCommand("env", {
    name: "Display environment variables.",
    synopsis : "env",
    description: "Print all currently defined environment variables.",
    options: [],
    examples: [
        "env"
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
        if(target in terminal.env){
            return {
                stdout: terminal.env[args[0]],
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