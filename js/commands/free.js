registerCommand("free", {
    name: "Display memory usage statistics.",
    synopsis : "free",
    description: "Displays the total amount of free and used physical (RAM) and swap memory in the system, along with the buffers and caches utilized by the kernel. It parses data directly from the system's /proc/meminfo file to provide a quick snapshot of memory allocation.",
    options: [],
    examples: [
        "free"
    ],
    execute(terminal, args, stdin) {
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        return {
            stdout: "guest users are not permitted view memory information.",
            stderr: "",
            exitCode: 0
        };
    }
});