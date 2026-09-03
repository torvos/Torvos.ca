/**
 * `dig` command.
 * Simulated DNS lookup utility, disabled for the guest account.
 */
registerCommand("dig", {
    name: "Query DNS name servers.",
    synopsis : "dig [OPTIONS] DOMAIN",
    description: "is a flexible DNS lookup utility used to query name servers for information about host addresses, mail exchanges, name servers, and related records.",
    options: [],
    examples: [
        "dig torvos.ca",
        "dig torvos.ca MX"
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
        return {
            stdout: "",
            stderr: "guest users are not permitted to run the dig command.",
            exitCode: EXIT_FAILURE
        };
    }
});
