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
        "-e    Interpret backslash escapes (\\n, \\t, \\r, \\\\) and ANSI color codes (\\e[31m red, \\e[32m green, \\e[33m yellow, \\e[34m blue, \\e[35m magenta, \\e[36m cyan, \\e[0m reset)."
    ],
    examples: [
        "echo Hello",
        "echo $HOME",
        "echo -e \"line1\\nline2\"",
        "echo -e \"\\e[32mPASS\\e[0m: all good\""
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
        let stdoutSegments; // only populated when ANSI color codes are present

        if (interpretEscapes) {
            text = text
                .replace(/\\\\/g, "\u0000") // temporarily protect literal backslashes
                .replace(/\\n/g, "\n")
                .replace(/\\t/g, "\t")
                .replace(/\\r/g, "\r")
                .replace(/\u0000/g, "\\");

            // ANSI SGR color codes: \e[NNm (or \033[NNm) select a color for
            // the text that follows, until the next code or \e[0m resets to
            // the default color. This is opt-in (only under -e, and only
            // when the text actually contains a code) so plain `echo` never
            // gets surprise coloring based on its content.
            const colorMap = {
                "0": COLOR_STDOUT,
                "31": COLOR_ERROR,
                "32": COLOR_SUCCESS,
                "33": COLOR_MATCH,
                "34": COLOR_DIRECTORY,
                "35": COLOR_MAGENTA,
                "36": COLOR_SYMLINK,
                "37": COLOR_STDOUT,
                "39": COLOR_STDOUT
            };
            const ansiPattern = /\\(?:e|033)\[(\d*)m/g;

            if (ansiPattern.test(text)) {
                ansiPattern.lastIndex = 0;
                let lastIndex = 0;
                let currentColor = COLOR_STDOUT;
                const tokens = [];
                let match;
                while ((match = ansiPattern.exec(text)) !== null) {
                    if (match.index > lastIndex) {
                        tokens.push({ text: text.slice(lastIndex, match.index), color: currentColor });
                    }
                    const code = match[1] || "0"; // "\e[m" with no digits means reset
                    currentColor = colorMap[code] ?? currentColor;
                    lastIndex = ansiPattern.lastIndex;
                }
                if (lastIndex < text.length) {
                    tokens.push({ text: text.slice(lastIndex), color: currentColor });
                }

                // The color codes themselves never appear in the returned
                // `stdout` - piping/capturing echo's output always yields
                // clean plain text, matching how a real terminal's escape
                // codes are display-only and don't show up when captured.
                text = tokens.map(t => t.text).join("");

                // Build per-line color segments (parallel to `stdout`'s
                // lines), carrying the active color across any newline
                // that falls inside a single colored token.
                const lineSegments = [[]];
                for (const token of tokens) {
                    const parts = token.text.split("\n");
                    parts.forEach((part, idx) => {
                        if (idx > 0) lineSegments.push([]);
                        if (part.length > 0) {
                            lineSegments[lineSegments.length - 1].push({ text: part, color: token.color });
                        }
                    });
                }
                stdoutSegments = lineSegments;
            }
        }

        return {
            stdout: text,
            stdoutSegments,
            stderr: "",
            exitCode: EXIT_SUCCESS
        };
    }
});