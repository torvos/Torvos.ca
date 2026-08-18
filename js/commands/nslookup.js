/**
 * `nslookup` command.
 * Simulated DNS lookup utility, disabled for the guest account.
 */
registerCommand("nslookup", {
    name: "Query DNS to resolve a hostname or IP address.",
    synopsis : "nslookup HOST",
    description: "is a network administration utility used to query the Domain Name System (DNS) to obtain the mapping between a domain name and its IP address, or vice versa.",
    options: [],
    examples: [
        "nslookup torvos.ca",
        "nslookup 1.1.1.1"
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
            stderr: "guest users are not permitted to run the nslookup command.",
            exitCode: 1
        };
    }
});
