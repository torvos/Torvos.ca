/**
 * `uniq` command.
 * Collapses runs of consecutive identical lines (like real `uniq`, it
 * only catches ADJACENT duplicates, not all duplicates in the file).
 * Supports -c (prefix with occurrence count), -d (only show duplicated
 * lines), -u (only show lines that appear exactly once).
 */
registerCommand("uniq", {
    name: "Filter adjacent duplicate lines.",
    synopsis : "uniq [OPTIONS] [INPUT_FILE]",
    description: "is a text processing utility used to filter, omit, or report repeated lines from a file or standard input.",
    options: [
        "-c    count the number of unique lines",
        "-d    only show/count duplicate lines",
        "-u    only show/count unique lines"
    ],
    examples: [
        "uniq access.log",
        "uniq -c access.log",
        "uniq -d access.log"
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
        const parsed = terminal.parseFlags(args, {c: false, d: false, u: false});
        const count = parsed.flags.has("c");
        const duplicatesOnly = parsed.flags.has("d");
        const uniqueOnly = parsed.flags.has("u");

        let text = "";
        if (stdin !== undefined && stdin !== null && stdin !== "") {
            text = stdin;
        } else {
            if (parsed.args.length === 0) {
                return {
                    stdout: "",
                    stderr: "uniq: missing operand",
                    exitCode: 1
                };
            }
            const node = terminal.fs.get(parsed.args[0], terminal.cwd);
            if (!node) {
                return {
                    stdout: "",
                    stderr: `uniq: ${parsed.args[0]}: No such file or directory`,
                    exitCode: 1
                };
            }

            if(terminal.fs.isInBin(parsed.args[0], terminal.cwd)){
                return {
                    stdout: "",
                    stderr: `uniq: cannot display files in /bin`,
                    exitCode: 1
                };
            }             

            if (terminal.fs.isDirectory(node)) {
                return {
                    stdout: "",
                    stderr: `uniq: ${parsed.args[0]}: Is a directory`,
                    exitCode: 1
                };
            }
            text = node.content;
        }
        let lines = text.split(/\r?\n/);
        if (lines.length && lines[lines.length - 1] === "") {
            lines.pop();
        }
        const output = [];
        // Scan through lines, grouping each run of identical consecutive
        // lines together and jumping the index past the whole run
        for (let i = 0; i < lines.length; ) {
            const line = lines[i];
            let occurrences = 1;
            while (
                i + occurrences < lines.length &&
                lines[i + occurrences] === line
            ) {
                occurrences++;
            }
            if (duplicatesOnly) {
                if (occurrences > 1) {
                    output.push(count ? `${occurrences} ${line}` : line);
                }
            } else if (uniqueOnly) {
                if (occurrences === 1) {
                    output.push(count ? `${occurrences} ${line}` : line);
                }
            } else {
                output.push(count ? `${occurrences} ${line}` : line);
            }
            i += occurrences;
        }

        return {
            stdout: output.join("\n"),
            stderr: "",
            exitCode: 0
        };
    }
});
