/**
 * `curl` command.
 * Simulated network fetch, disabled for the guest account (always returns a permission-denied error).
 */
registerCommand("curl", {
    name: "Retrieve data from a URL.",
    synopsis : "curl URL",
    description: "Download the contents of a URL and write the response to standard output.",
    options: [],
    examples: [
        "curl https://example.com"
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
            stderr: "guest users are not permitted to run the curl command.",
            exitCode: EXIT_FAILURE
        };
    }
});