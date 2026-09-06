/**
 * `printenv` command.
 * With no arguments, prints every environment variable as a "KEY=value"
 * line (matching real printenv/env's standard output format). With one
 * argument, prints just that variable's raw value, same as real printenv.
 */
registerCommand("printenv", {
    name: "Print environment variables.",
    synopsis : "printenv [VARIABLE]",
    description: "prints the values of all or specific environment variables configured in your active terminal session.",
    options: [],
    examples: [
        "printenv",
        "printenv PATH"
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

        if (target) {
            // A specific variable was requested - print just its raw
            // value (no "NAME=" prefix), matching real printenv.
            if (target in terminal.env) {
                return {
                    stdout: terminal.env[target],
                    stderr: "",
                    exitCode: EXIT_SUCCESS
                };
            }
            return {
                stdout: "",
                stderr: "",
                exitCode: EXIT_FAILURE
            };
        }

        // No argument - build a "KEY=value" line for every env var
        let listing = "";
        let listingSegments = [];
        for (const key in terminal.env) {
            if (terminal.env.hasOwnProperty(key)) {
                listing += `${key}=${terminal.env[key]}\n`;
                listingSegments.push([
                    { text: `${key}=`, color: COLOR_LABEL },
                    { text: `${terminal.env[key]}`, color: COLOR_STDOUT }
                ]);
            }
        }
        
        return {
            stdout: listing.replace(/\r?\n$/, ""), // strip the trailing newline
            stdoutSegments: listingSegments,
            stderr: "",
            exitCode: EXIT_SUCCESS
        };        
    }
});
