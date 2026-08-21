/**
 * `base64` command.
 * Encodes (default) or decodes (-d) piped stdin or a file's content as
 * base64, wrapping encoded output at 76 characters by default (matching
 * GNU coreutils' base64), or -w N to set a custom wrap width (0 = no wrap).
 */
registerCommand("base64", {
    name: "Base64 encode or decode data.",
    synopsis : "base64 [OPTIONS] [FILE]",
    description: "is a built-in utility that encodes binary/text data into base64, or decodes base64 back into its original form. Reads from FILE, or from standard input if no file is given.",
    options: [
        "-d, --decode    Decode base64 input instead of encoding.",
        "-w N            Wrap encoded output at N characters (default 76, 0 disables wrapping)."
    ],
    examples: [
        "base64 resume.md",
        "echo hello | base64",
        "echo aGVsbG8= | base64 -d"
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
        const parsed = terminal.parseFlags(args, { d: false, decode: false, w: true });
        const decode = parsed.flags.has("d") || parsed.flags.has("decode");
        const wrapArg = parsed.options.w;
        const wrapWidth = wrapArg !== undefined ? parseInt(wrapArg, 10) : 76;
        const target = parsed.args[0];
        let content = "";

        if (!target) {
            // No file given - fall back to piped stdin
            if (!stdin) {
                return {
                    stdout: "",
                    stderr: "base64: missing operand",
                    exitCode: 1
                };
            }
            content = stdin;
        } else {
            const node = terminal.fs.get(target, terminal.cwd);
            if (!node) {
                return {
                    stdout: "",
                    stderr: `base64: ${target}: No such file or directory`,
                    exitCode: 1
                };
            }

            if (terminal.fs.isProtected(target, terminal.cwd) && !terminal.fs.isDevice(node)) {
                return {
                    stdout: "",
                    stderr: `base64: ${target}: Permission denied`,
                    exitCode: 1
                };
            }

            if (terminal.fs.isDirectory(node)) {
                return {
                    stdout: "",
                    stderr: `base64: ${target}: Is a directory`,
                    exitCode: 1
                };
            }
            node.accessed = Date.now();
            content = terminal.fs.readContent(node);
        }

        if (decode) {
            try {
                // Strip whitespace/newlines (real base64 -d tolerates wrapped input)
                const cleaned = content.replace(/\s+/g, "");
                const binary = atob(cleaned);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                const decoded = new TextDecoder().decode(bytes);
                return {
                    stdout: decoded,
                    stderr: "",
                    exitCode: 0
                };
            } catch (err) {
                return {
                    stdout: "",
                    stderr: "base64: invalid input",
                    exitCode: 1
                };
            }
        }

        // Encode - UTF-8 safe (btoa alone only handles Latin1)
        const bytes = new TextEncoder().encode(content);
        let binary = "";
        for (const b of bytes) {
            binary += String.fromCharCode(b);
        }
        let encoded = btoa(binary);

        if (wrapWidth > 0) {
            const wrapped = [];
            for (let i = 0; i < encoded.length; i += wrapWidth) {
                wrapped.push(encoded.slice(i, i + wrapWidth));
            }
            encoded = wrapped.join("\n");
        }

        return {
            stdout: encoded,
            stderr: "",
            exitCode: 0
        };
    }
});
