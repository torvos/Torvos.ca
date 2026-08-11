/**
 * `sudo` command.
 * Simulated privilege escalation; always denied for the guest account.
 */
registerCommand("sudo", {
    name: "Execute a command with elevated privileges.",
    synopsis : "sudo COMMAND",
    description: "allows authorized users to execute commands with administrative or root privileges without logging in directly as the root user.",
    options: [],
    examples: [
        "sudo"
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
            stderr: "guest users are not allowed to invoke sudo, this incident will be reported.",
            exitCode: 1
        };
    }
});