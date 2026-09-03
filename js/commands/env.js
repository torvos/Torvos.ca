/**
 * `env` command.
 * With no arguments, lists all environment variables as KEY=value pairs.
 * With one argument, prints just that variable's value (also used by
 * the test suite in filesystem.js's default .script.sh to inspect state).
 */
registerCommand("env", {
    name: "Display environment variables.",
    synopsis : "env",
    description: "Print all currently defined environment variables.",
    options: [],
    examples: [
        "env"
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

        if (!target) {
            // No specific variable requested - dump everything as KEY=value lines
            const listing = Object.entries(terminal.env)
                .map(([key, value]) => `${key}=${value}`)
                .join("\n");
            return {
                stdout: listing,
                stderr: "",
                exitCode: EXIT_SUCCESS
            };
        }

        if(target in terminal.env){
            return {
                stdout: terminal.env[target],
                stderr: "",
                exitCode: EXIT_SUCCESS
            };
        }
        else{
            return {
                stdout: "",
                stderr: "env: variable not set",
                exitCode: EXIT_FAILURE
            };        
        }
    }
});
