/**
 * `nmap` command.
 * Simulated network port scanner, disabled for the guest account.
 */
registerCommand("nmap", {
    name: "Scan a host for open ports.",
    synopsis : "nmap [OPTIONS] TARGET",
    description: "is a network exploration and security auditing tool used to discover hosts and services on a network by sending crafted packets and analyzing the responses.",
    options: [],
    examples: [
        "nmap 127.0.0.1",
        "nmap -p 1-1000 10.0.0.1"
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
            stderr: "guest users are not permitted to run the nmap command.",
            exitCode: EXIT_FAILURE
        };
    }
});
