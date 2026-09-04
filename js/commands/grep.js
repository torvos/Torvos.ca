/**
 * `grep` command.
 * Filters lines from stdin (piped input) or a named file, keeping only
 * lines that contain the given literal pattern (substring match, not a
 * full regex). Exits non-zero if no lines matched, like real grep.
 */
registerCommand("grep", {
    name: "Search files for matching text.",
    synopsis : "grep [options] 'pattern' filename",
    description: "Searches text for lines containing a literal substring (not a regular expression) and prints every matching line - like `grep --fixed-strings`. Reads from a piped stdin if given, otherwise from one or more named files.",
    options: [],
    examples: [
        "grep \"error\" log.txt",
        "cat text.txt | grep \"error\""
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
        const pattern = args[0];
        const targets = args.slice(1);

        if (!pattern) {
            return {
                stdout: "",
                stderr: "grep: missing pattern",
                exitCode: EXIT_FAILURE
            };
        }

        // Highlight every occurrence of `pattern` within a matched line,
        // leaving the rest of the line in the default terminal color -
        // same idea as `grep --color`. `prefix` (a filename, when more
        // than one file is being searched) is prepended un-highlighted.
        function highlightLine(line, prefix) {
            const segments = [];
            if (prefix) {
                segments.push({ text: prefix, color: COLOR_STDOUT });
            }
            let rest = line;
            let idx;
            while ((idx = rest.indexOf(pattern)) !== -1) {
                if (idx > 0) {
                    segments.push({ text: rest.slice(0, idx), color: COLOR_STDOUT });
                }
                segments.push({ text: rest.slice(idx, idx + pattern.length), color: COLOR_MATCH });
                rest = rest.slice(idx + pattern.length);
            }
            if (rest) {
                segments.push({ text: rest, color: COLOR_STDOUT });
            }
            return segments;
        }

        // Prefer piped stdin; otherwise read every named file argument -
        // like real grep, one bad/missing file doesn't stop the rest from
        // being searched, and matches from multiple files get a
        // "filename:" prefix so they stay distinguishable.
        if (stdin.length !== 0) {
            const lines = stdin.split(/\r?\n/);
            const matches = lines.filter(line => line.includes(pattern));
            return {
                stdout: matches.join("\n"),
                stdoutSegments: matches.map(line => highlightLine(line, null)),
                stderr: "",
                exitCode: matches.length ? EXIT_SUCCESS : EXIT_FAILURE
            };
        }

        if (targets.length === 0) {
            return {
                stdout: "",
                stderr: "grep: no input",
                exitCode: EXIT_FAILURE
            };
        }

        const outLines = [];
        const outSegments = [];
        const errors = [];
        const multi = targets.length > 1;

        for (const target of targets) {
            const node = terminal.fs.get(target, terminal.cwd);
            if (!node) {
                errors.push(`grep: ${target}: No such file or directory`);
                continue;
            }
            if (terminal.fs.isProtected(target, terminal.cwd) && !terminal.fs.isDevice(node)) {
                errors.push(`grep: ${target}: Permission denied`);
                continue;
            }
            if (terminal.fs.isDirectory(node)) {
                errors.push(`grep: ${target}: Is a directory`);
                continue;
            }
            const matches = terminal.fs.readContent(node)
                .split(/\r?\n/)
                .filter(line => line.includes(pattern));

            for (const line of matches) {
                const prefix = multi ? `${target}:` : null;
                outLines.push(prefix ? `${prefix}${line}` : line);
                outSegments.push(highlightLine(line, prefix));
            }
        }

        if (outLines.length === 0 && errors.length > 0) {
            return {
                stdout: "",
                stderr: errors.join("\n"),
                exitCode: EXIT_FAILURE
            };
        }

        return {
            stdout: outLines.join("\n"),
            stdoutSegments: outSegments,
            stderr: errors.join("\n"),
            exitCode: outLines.length ? EXIT_SUCCESS : EXIT_FAILURE
        };
    }
});
