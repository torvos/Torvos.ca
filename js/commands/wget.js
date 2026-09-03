/**
 * `wget` command.
 * Simulated file download, disabled for the guest account.
 */
registerCommand("wget", {
    name: "Download files from the web.",
    synopsis : "wget URL",
    description: "Download files from the web.",
    options: [],
    examples: [
        "wget http://example.com/index.html"
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
            stderr: "guest users are not permitted to run the wget command.",
            exitCode: EXIT_FAILURE
        };
    }
});