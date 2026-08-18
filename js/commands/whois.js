/**
 * `whois` command.
 * Simulated domain registration lookup, disabled for the guest account.
 */
registerCommand("whois", {
    name: "Look up domain registration information.",
    synopsis : "whois DOMAIN",
    description: "is a query tool used to look up the registered owner, registrar, and registration dates of a domain name or IP address block.",
    options: [],
    examples: [
        "whois torvos.ca",
        "whois 1.1.1.1"
    ],
    async execute(terminal, args, stdin) {
        // Print usage info and exit early when --help is passed
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        return {
            stdout: "",
            stderr: "guest users are not permitted to run the whois command.",
            exitCode: 1
        };
    }
});
