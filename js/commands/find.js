/**
 * `find` command.
 * Recursively walks a starting directory, printing the path of every
 * descendant that matches the given filters: -name (glob pattern
 * converted to regex), -type (f for file, d for directory), and
 * -maxdepth (recursion limit).
 */
registerCommand("find", {
    name: "Search for files and directories.",
    synopsis : "find [PATH] [OPTIONS]",
    description: "Recursively search a directory tree for files or directories matching specified criteria.",
    options: [
        "-name PATTERN      Match file names.",
        "-type TYPE         Match object type.",
        "-maxdepth N        Limit recursion depth."
    ],
    examples: [
        "find . -name '*.txt'",
        "find / -type d",
        "find . -maxdepth 2"
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
        const parsed = terminal.parseFlags(args, {name: true, type: true, maxdepth: true});
        const namePattern = parsed.options?.name ?? null;
        const typeFilter = parsed.options?.type ?? null;
        const maxDepth = parsed.options?.maxdepth !== undefined ? parseInt(parsed.options.maxdepth, 10) : Infinity;

        // Converts a simple glob pattern (only "*" and "?" are wildcards,
        // matching find -name's own semantics) into an anchored regex.
        // Every OTHER character is escaped if it happens to be a regex
        // metacharacter (".", "+", "(", ")", "[", "]", "^", "$", "{",
        // "}", "|", "\\") - a filename containing one of those (e.g.
        // "file(1).txt" or "a+b.txt") must match itself literally, not
        // be reinterpreted as regex syntax. Building the regex source
        // character-by-character like this (rather than a handful of
        // blind global replaces) is what makes that possible.
        function globToRegExpSource(pattern) {
            let source = "";
            for (const ch of pattern) {
                if (ch === "*") {
                    source += ".*";
                } else if (ch === "?") {
                    source += ".";
                } else if (/[.*+?^${}()|[\]\\]/.test(ch)) {
                    source += "\\" + ch;
                } else {
                    source += ch;
                }
            }
            return source;
        }

        let regex = null;
        if (namePattern) {
            try {
                regex = new RegExp("^" + globToRegExpSource(namePattern) + "$");
            } catch {
                return {
                    stdout: "",
                    stderr: `find: invalid -name pattern: '${namePattern}'`,
                    exitCode: EXIT_FAILURE
                };
            }
        }

        const target = parsed.args[0] || terminal.cwd;
        const path = terminal.fs.getFullPath(target, terminal.cwd);
        const root = terminal.fs.get(target, terminal.cwd);

        if (!root) {
            return {
                stdout: "",
                stderr: `find: '${target}': No such starting directory`,
                exitCode: EXIT_FAILURE
            };
        }

        // Checks the type/name filters against a single node, the same
        // logic walk() below applies to every child.
        function matchesFilters(node, name) {
            const isDir = terminal.fs.isDirectory(node);
            const matches = namePattern ? regex.test(name) : true;
            return typeFilter === "f" ? (terminal.fs.isFile(node) && matches)
                : typeFilter === "d" ? (isDir && matches)
                : matches;
        }

        // Real `find` always evaluates (and, if it matches, prints) the
        // STARTING path itself first, before any of its descendants - e.g.
        // `find /home/guest` begins its output with "/home/guest" itself,
        // and `find somefile.txt` (a plain file, not a directory at all)
        // prints just that one line if it matches, with nothing to walk
        // into. This walked the tree without ever considering the root
        // node itself, so both of those cases previously printed nothing.
        const rootName = path === "/" ? "/" : path.slice(path.lastIndexOf("/") + 1);
        const rootSegments = [];
        let rootText = "";
        if (matchesFilters(root, rootName)) {
            rootText = `${path}\n`;
            rootSegments.push({
                text: path,
                color: terminal.fs.isDirectory(root) ? COLOR_DIRECTORY : COLOR_STDOUT
            });
        }

        // Recursively walks `node`, appending a line for every child that
        // passes the type/name filters, then descending into subdirectories
        // (as long as maxDepth allows).
        function walk(node, path = terminal.cwd, depth = 1) {
            if(path === "/"){
                path = "";
            }
            let output = "";
            let segments = [];
            if (depth > maxDepth || !node.children) {
                return { text: output, segments };
            }
            let keys = Object.keys(node.children);
            keys.forEach((key, index) => {
                const child = node.children[key];
                const isDir = terminal.fs.isDirectory(child);

                if (matchesFilters(child, key)) {
                    const line = `${path}/${key}`;
                    output += `${line}\n`;
                    // Color directory paths distinctly from file paths,
                    // same convention as ls/tree.
                    segments.push({
                        text: line,
                        color: isDir ? COLOR_DIRECTORY : COLOR_STDOUT
                    });
                }
                if (isDir && depth < maxDepth) {
                    const nextPath = path + "/" + key;
                    const nested = walk(child, nextPath, depth + 1);
                    output += nested.text;
                    segments.push(...nested.segments);
                }
            });
            return { text: output, segments };
        }

        const walked = walk(root, path);
        const fullText = rootText + walked.text;
        const fullSegments = rootSegments.concat(walked.segments);

        return {
            stdout: fullText.replace(/\r?\n$/, ""),
            stdoutSegments: fullSegments.map(seg => [seg]),
            stderr: "",
            exitCode: EXIT_SUCCESS
        };
    }
});
