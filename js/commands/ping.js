/**
 * `ping` command.
 * Simulated network ping, disabled for the guest account.
 */
registerCommand("ping", {
    name: "Test network connectivity.",
    synopsis : "ping \"IP ADDRESS\"",
    description: "is a built-in network diagnostic tool used to test the reachability of a host and measure the round-trip time (RTT) for data packets.",
    options: [],
    examples: [
        "ping 127.0.0.1",
        "ping 1.2.3.4"
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
            stderr: "guest users are not permitted to run the ping command.",
            exitCode: 1
        };
    }
});