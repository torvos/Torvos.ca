/**
 * `uname` command.
 * Prints system identification info (kernel name, hostname, version,
 * machine, and OS), mirroring the real Linux `uname` utility's flags.
 */
registerCommand("uname", {
    name: "Print system information.",
    synopsis : "uname [OPTIONS]",
    description: "is a built-in utility that prints certain system information such as the kernel name, hostname, kernel release, and machine hardware. With no options, prints only the kernel name.",
    options: [
        "-a    Print all information, in the order: kernel name, hostname, kernel release, machine, operating system.",
        "-s    Print the kernel name (default).",
        "-n    Print the network hostname.",
        "-r    Print the kernel release (version).",
        "-m    Print the machine hardware name.",
        "-o    Print the operating system."
    ],
    examples: [
        "uname",
        "uname -a",
        "uname -sr"
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
        const parsed = terminal.parseFlags(args, { a: false, s: false, n: false, r: false, m: false, o: false });

        const kernelName = "Torvos";
        const hostname = terminal.env.HOSTNAME ?? HOSTNAME;
        const release = TERMINAL_VERSION;
        const machine = "x86_64";
        const os = "GNU/Torvos";

        const fields = [];
        if (parsed.flags.has("a")) {
            fields.push(kernelName, hostname, release, machine, os);
        } else {
            // Individual flags print in a fixed order regardless of how the
            // user typed them (matching real uname's behavior)
            if (parsed.flags.has("s")) fields.push(kernelName);
            if (parsed.flags.has("n")) fields.push(hostname);
            if (parsed.flags.has("r")) fields.push(release);
            if (parsed.flags.has("m")) fields.push(machine);
            if (parsed.flags.has("o")) fields.push(os);
            if (fields.length === 0) {
                // No flags at all - default to just the kernel name
                fields.push(kernelName);
            }
        }

        return {
            stdout: fields.join(" "),
            stderr: "",
            exitCode: 0
        };
    }
});
