registerCommand("wc", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
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
            const fullPath = resolveRelativePath(terminal.cwd, target);
            let pathresult = resolvePath(fullPath);
            const node = pathresult ? pathresult.node : null;

            if (!node) {
                return {
                    stdout: "",
                    stderr: `wc: ${target}: no such file`,
                    exitCode: 1
                };
            }

            if(fullPath.includes("/bin/")){
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