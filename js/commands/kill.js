/**
 * `kill` command.
 * Simulated process termination, disabled for the guest account.
 */
registerCommand("kill", {
    name: "Terminate a running process.",
    synopsis : "kill",
    description: "command sends a specific system signal to a running process using its unique Process ID (PID). While it is most frequently used to stop or force-close applications, it can also pause, resume, or reload them depending on the signal specified.",
    options: [],
    examples: [
        "kill"
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
            stderr: "guest users are not permitted to kill processes.",
            exitCode: 1
        };
    }
});