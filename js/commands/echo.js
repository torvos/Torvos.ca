/**
 * `echo` command.
 * Prints its arguments back out, space-joined (like the standard Unix `echo`).
 * Supports leading -n/-e/-ne flags (bash builtin style: only recognized as
 * a run of flags right at the start of the arguments, stopping at the
 * first argument that isn't purely made of n/e characters).
 */
registerCommand("echo", {
    name: "Display text or expanded variables.",
    synopsis : "echo [-ne] [TEXT...]",
    description: "Write the supplied text to standard output after performing shell expansions such as variables, wildcards, or command substitution where supported.",
    options: [
        "-n    Do not treat the output as ending in a new line (this shell never appends one anyway - kept for compatibility with scripts that pass it).",
        "-e    Interpret backslash escapes in the text (\\n, \\t, \\r, \\\\)."
    ],
    examples: [
        "echo Hello",
        "echo $HOME",
        "echo -e \"line1\\nline2\"",
        "echo -n \"no trailing newline\""
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

        let interpretEscapes = false;
        let i = 0;
        // Consume a run of "-n"/"-e"/"-ne"/"-en"-style flags at the very
        // start of the arguments (bash's echo builtin doesn't do full
        // getopt-style parsing - just this simple prefix heuristic).
        while (i < args.length && /^-[ne]+$/.test(args[i])) {
            for (const ch of args[i].slice(1)) {
                if (ch === "e") interpretEscapes = true;
                // "n" is accepted and consumed for compatibility, but this
                // shell's echo never appended a trailing newline to begin
                // with (each command's output is rendered/piped as-is), so
                // there's nothing further to suppress.
            }
            i++;
        }

        let text = args.slice(i).join(" ");

        if (interpretEscapes) {
            text = text
                .replace(/\\\\/g, "\u0000") // temporarily protect literal backslashes
                .replace(/\\n/g, "\n")
                .replace(/\\t/g, "\t")
                .replace(/\\r/g, "\r")
                .replace(/\u0000/g, "\\");
        }

        return {
            stdout: text,
            stderr: "",
            exitCode: 0
        };
    }
});