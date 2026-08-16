/**
 * `hostname` command.
 * Prints the system's hostname. Attempting to set it (a real hostname
 * command's other main use) is refused, same as the guest-restriction
 * pattern used by ps/free/df.
 */
registerCommand("hostname", {
    name: "Display the system hostname.",
    synopsis : "hostname [NAME]",
    description: "is a built-in utility that prints the name of the current host system. Changing the hostname requires elevated privileges.",
    options: [],
    examples: [
        "hostname"
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
        if (args.length > 0) {
            return {
                stdout: "",
                stderr: "hostname: you must be root to change the host name",
                exitCode: 1
            };
        }

        return {
            stdout: terminal.env.HOSTNAME ?? HOSTNAME,
            stderr: "",
            exitCode: 0
        };
    }
});
