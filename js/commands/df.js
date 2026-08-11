/**
 * `df` command.
 * Simulated disk-usage report, disabled for the guest account.
 */
registerCommand("df", {
    name: "Report filesystem disk usage.",
    synopsis : "df",
    description: "Display the total, used, and available space for the current virtual filesystem.",
    options: [],
    examples: [
        "df"
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
            stderr: "guest users are not permitted view storage information.",
            exitCode: 1
        };
    }
});