/**
 * `free` command.
 * Simulated memory-usage report, disabled for the guest account.
 */
registerCommand("free", {
    name: "Display memory usage statistics.",
    synopsis : "free",
    description: "Displays the total amount of free and used physical (RAM) and swap memory in the system, along with the buffers and caches utilized by the kernel. It parses data directly from the system's /proc/meminfo file to provide a quick snapshot of memory allocation.",
    options: [],
    examples: [
        "free"
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
            stderr: "guest users are not permitted to view memory information.",
            exitCode: EXIT_FAILURE
        };
    }
});