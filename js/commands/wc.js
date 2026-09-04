/**
 * `wc` command.
 * Counts lines, words, and bytes in a file (or piped stdin). With no
 * flags, prints all three labeled; with -l/-w/-c, prints only the
 * requested counts (space-separated).
 */
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
        // Print usage info and exit early when --help is passed
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: EXIT_SUCCESS
            };                
        }        
        const parsed = terminal.parseFlags(args, {l: false, w: false, c: false});
        const countLines = parsed.flags.has("l");
        const countWords = parsed.flags.has("w");
        const countBytes = parsed.flags.has("c");
        const targets = parsed.args;

        // Counts lines/words/bytes for one chunk of text.
        function countOf(content) {
            // Real `wc -l` counts newline CHARACTERS, not the number of
            // pieces splitting on them produces - a file with no trailing
            // newline has one fewer line than split()'s length would say
            // (its last, unterminated chunk isn't a counted "line"), and
            // a file that ends with a newline has exactly as many lines
            // as newlines, not one more for the trailing empty chunk.
            const lines = content.length === 0
                ? 0
                : (content.match(/\r?\n/g) || []).length;

            const words = content
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .length;

            const bytes = new TextEncoder()
                .encode(content)
                .length;

            return { lines, words, bytes };
        }

        // Formats one counts object into this command's output line,
        // optionally suffixed with a filename (real `wc` does the same
        // for its own line/word/byte columns).
        function formatCounts(counts, label) {
            let output;
            if (countLines || countWords || countBytes) {
                // At least one specific count was requested - print only those,
                // in l/w/c order, space-separated (no labels)
                const values = [];
                if (countLines) {
                    values.push(counts.lines);
                }
                if (countWords) {
                    values.push(counts.words);
                }
                if (countBytes) {
                    values.push(counts.bytes);
                }
                output = values.join(" ");
            } else {
                // No flags - print all three counts with labels
                output =
                    `Lines: ${String(counts.lines)}  ` +
                    `Words: ${String(counts.words)}  ` +
                    `Bytes: ${String(counts.bytes)}  `;
            }
            if (label) {
                output += ` ${label}`;
            }
            return output;
        }

        if (targets.length === 0) {
            // No file given - fall back to piped stdin
            if (!stdin) {
                return {
                    stdout: "",
                    stderr: "wc: missing operand",
                    exitCode: EXIT_FAILURE
                };
            }
            return {
                stdout: formatCounts(countOf(stdin), null),
                stderr: "",
                exitCode: EXIT_SUCCESS
            };
        }

        // Real `wc` prints one line per file (in order), keeps going after
        // a bad file rather than stopping, and - when given more than one
        // file - adds a final "total" line summing every count.
        const lines = [];
        const errors = [];
        const total = { lines: 0, words: 0, bytes: 0 };

        for (const target of targets) {
            const node = terminal.fs.get(target, terminal.cwd);

            if (!node) {
                errors.push(`wc: ${target}: no such file`);
                continue;
            }

            if (terminal.fs.isProtected(target, terminal.cwd) && !terminal.fs.isDevice(node)) {
                errors.push(`wc: ${target}: Permission denied`);
                continue;
            }

            if (terminal.fs.isDirectory(node)) {
                errors.push(`wc: ${target}: is a directory`);
                continue;
            }
            node.accessed = Date.now();
            const counts = countOf(terminal.fs.readContent(node));
            total.lines += counts.lines;
            total.words += counts.words;
            total.bytes += counts.bytes;
            lines.push(formatCounts(counts, target));
        }

        if (targets.length > 1 && lines.length > 0) {
            lines.push(formatCounts(total, "total"));
        }

        return {
            stdout: lines.join("\n"),
            stderr: errors.join("\n"),
            exitCode: errors.length ? EXIT_FAILURE : EXIT_SUCCESS
        };
    }
});
