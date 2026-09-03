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
        // Convert a simple glob pattern (* and ?) into an anchored regex
        const regex = namePattern ? new RegExp("^" + namePattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".") + "$"): null;

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
                const matches = (namePattern ? regex.test(key) : true);

                const shouldPrint =
                    typeFilter === "f" ? (terminal.fs.isFile(child) && matches) :
                    typeFilter === "d" ? (isDir && matches) :
                    matches;

                if (shouldPrint) {
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

        return {
            stdout: walked.text.replace(/\r?\n$/, ""),
            stdoutSegments: walked.segments.map(seg => [seg]),
            stderr: "",
            exitCode: EXIT_SUCCESS
        };
    }
});
