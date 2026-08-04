registerCommand("env", {
    name: "Display environment variables.",
    synopsis : "env",
    description: "Print all currently defined environment variables.",
    options: [],
    examples: [
        "env"
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

        if (!target) {
            const listing = Object.entries(terminal.env)
                .map(([key, value]) => `${key}=${value}`)
                .join("\n");
            return {
                stdout: listing,
                stderr: "",
                exitCode: 0
            };
        }

        if(target in terminal.env){
            return {
                stdout: terminal.env[target],
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