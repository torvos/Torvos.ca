registerCommand("wc", {
    name: "Count lines, words, and characters.",
    synopsis : "wc [OPTIONS] FILE...",
    description: "is a built-in terminal utility used to count lines, words, characters, and bytes in text files or pipeline outputs.",
    options: [
        "-l.   only show the number of lines.",
        "-w    only show the number of words.",
        "-c    only show the size of Bytes."
    ],
    examples: [
        "wc -l notes.txt",
        "wc -w file1.txt file2.txt"
    ],
    async execute(terminal, args, stdin) {
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }        
        const parsed = terminal.parseFlags(args, {l: false, w: false, c: false});
        const countLines = parsed.flags.has("l");
        const countWords = parsed.flags.has("w");
        const countBytes = parsed.flags.has("c");
        const target = parsed.args[0];
        let content = "";

        if (!target) {
            if (!stdin) {
                return {
                    stdout: "",
                    stderr: "wc: missing operand",
                    exitCode: 1
                };
            }
            content = stdin;
        } else {
            const node = terminal.fs.get(target, terminal.cwd);

            if (!node) {
                return {
                    stdout: "",
                    stderr: `wc: ${target}: no such file`,
                    exitCode: 1
                };
            }

            if(terminal.fs.isInBin(target, terminal.cwd)){
                return {
                    stdout: "",
                    stderr: `wc: cannot access files in /bin`,
                    exitCode: 1
                };
            }             

            if (node.type === "dir") {
                return {
                    stdout: "",
                    stderr: `wc: ${target}: is a directory`,
                    exitCode: 1
                };
            }
            node.accessed = Date.now();
            content = node.content;
        }

        const lines = content.length === 0
            ? 0
            : content.split(/\r?\n/).length;

        const words = content
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .length;

        const bytes = new TextEncoder()
            .encode(content)
            .length;

        let output;

        if (countLines || countWords || countBytes) {
            const values = [];
            if (countLines) {
                values.push(lines);
            }
            if (countWords) {
                values.push(words);
            }
            if (countBytes) {
                values.push(bytes);
            }
            output = values.join(" ");
        } else {
            output =
                `Lines: ${String(lines)}  ` +
                `Words: ${String(words)}  ` +
                `Bytes: ${String(bytes)}  `;

        }
            if (target) {
            output += ` ${target}`;
        }
        return {
            stdout: output,
            stderr: "",
            exitCode: 0
        };
    }
});