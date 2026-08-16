/**
 * `sha256sum` command.
 * Computes the SHA-256 digest of piped stdin or one or more files, printing
 * "<hash>  <name>" per GNU coreutils' format (stdin is shown as "-").
 * Uses the browser's native WebCrypto SubtleCrypto digest implementation.
 */
registerCommand("sha256sum", {
    name: "Compute SHA-256 checksums.",
    synopsis : "sha256sum [FILE]...",
    description: "is a built-in utility that computes and prints the SHA-256 message digest of each given file, or of standard input if none is given.",
    options: [],
    examples: [
        "sha256sum resume.md",
        "echo hello | sha256sum"
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

        async function sha256(text) {
            const bytes = new TextEncoder().encode(text);
            const digest = await crypto.subtle.digest("SHA-256", bytes);
            return Array.from(new Uint8Array(digest))
                .map(b => b.toString(16).padStart(2, "0"))
                .join("");
        }

        const targets = args.filter(a => a !== "--help");

        if (targets.length === 0) {
            if (!stdin) {
                return {
                    stdout: "",
                    stderr: "sha256sum: missing operand",
                    exitCode: 1
                };
            }
            return {
                stdout: `${await sha256(stdin)}  -`,
                stderr: "",
                exitCode: 0
            };
        }

        let out = "";
        let err = "";
        let exitCode = 0;

        for (const target of targets) {
            const node = terminal.fs.get(target, terminal.cwd);
            if (!node) {
                err += `sha256sum: ${target}: No such file or directory\n`;
                exitCode = 1;
                continue;
            }
            if (terminal.fs.isInBin(target, terminal.cwd)) {
                err += `sha256sum: cannot access files in /bin\n`;
                exitCode = 1;
                continue;
            }
            if (terminal.fs.isDirectory(node)) {
                err += `sha256sum: ${target}: Is a directory\n`;
                exitCode = 1;
                continue;
            }
            node.accessed = Date.now();
            out += `${await sha256(terminal.fs.readContent(node))}  ${target}\n`;
        }

        return {
            stdout: out.replace(/\r?\n$/, ""),
            stderr: err.replace(/\r?\n$/, ""),
            exitCode
        };
    }
});
