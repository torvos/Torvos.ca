/**
 * `ls` command.
 * Lists the contents of one or more directories (or, for a file/symlink
 * target, just that entry itself). Supports -l (long/detailed format),
 * -a (include hidden entries), and -R (recurse into subdirectories,
 * printing a "path:" header before each nested listing).
 */
registerCommand("ls", {
    name: "List directory contents.",
    synopsis : "ls [OPTIONS] directory",
    description: "The ls command is used to list files and directories within your current working directory or a specified path in Linux. It is one of the most fundamental tools for terminal navigation, functioning as the command-line equivalent of opening a folder in a graphical file explorer.",
    options: [
        "-l.   long format with file information",
        "-a.   show hidden files and folders",
        "-R    apply permissions recursively to contents of a folder."
    ],
    examples: [
        "ls -R /",
        "ls -la ~",
        "ls"
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
        const parsed = terminal.parseFlags(args,{l: false,a: false,R: false});
        const longFormat = parsed.flags.has("l");
        const showHidden = parsed.flags.has("a");
        const recursive = parsed.flags.has("R");

        if (parsed.args.length === 0) {
            // If a glob argument (e.g. "ls *.zzz") expanded to nothing, that's
            // a deliberate "no matches" result - print nothing rather than
            // falling back to listing cwd.
            if (terminal.lastExpansionEmpty) {
                terminal.lastExpansionEmpty = false;
                return {
                    stdout:"",
                    stderr:"",
                    exitCode:0
                };
            }
            // No target given at all - default to the current directory
            parsed.args.push(terminal.cwd);
        }

        const targets = parsed.args.length > 0
            ? parsed.args
            : [terminal.cwd];

        let output = [];
        let errors = [];

        /**
         * Builds the listing text for a single directory node. Recurses
         * into subdirectories (appending their own listings, headed by
         * their path) when -R is set.
         * @param {Object} dirNode - The directory's filesystem node.
         * @param {string} dirPath - This directory's display path prefix
         *   (used to build child paths for recursive listings).
         * @returns {string} The formatted listing for this directory.
         */
        function listDirectory(dirNode, dirPath) {
            dirNode.accessed = Date.now();
            const children = dirNode.children || {};
            const keys = Object.keys(children);
            let entries = [];
            let directories = [];
            keys.forEach(name => {
                const child = children[name];
                if (child.hidden && !showHidden) {
                    return;
                }
                if (longFormat) {
                    entries.push(terminal.fs.formatLongEntry(name, child));
                }
                else {
                    // Short format: just the name, with a trailing "/" for directories
                    entries.push(
                        terminal.fs.isDirectory(child)
                            ? `${name}/`
                            : name
                    );
                }
                if (terminal.fs.isDirectory(child)) {
                    directories.push({
                        name,
                        node: child
                    });
                }
            });

            if (recursive) {
                // Append each subdirectory's own listing, with a blank line
                // and a "path:" header, mimicking real `ls -R` output
                directories.forEach(dir => {
                    entries.push("");
                    entries.push(
                        `${dirPath}${dir.name}:`
                    );
                    entries.push(
                        listDirectory(
                            dir.node,
                            `${dirPath}${dir.name}/`
                        )
                    );
                });
            }

            return entries.join(
                recursive || longFormat
                    ? "\n"   // one entry per line
                    : "  "   // short format packs entries on one line
            );
        }

        for (const target of targets) {
            const node = terminal.fs.get(target, terminal.cwd);

            if (!node) {
                errors.push(
                    `ls: cannot access '${target}': No such file or directory`
                );
                continue;
            }

            if (terminal.fs.isFile(node) || terminal.fs.isSymlink(node)) {
                // Listing a file/symlink directly just prints that one entry
                if (longFormat) {
                    output.push(
                        terminal.fs.formatLongEntry(
                            target.split(ROOT).pop(),
                            node
                        )
                    );
                }
                else {
                    output.push(
                        target.split(ROOT).pop()
                    );
                }
                continue;
            }

            if (targets.length > 1) {
                // Multiple targets given - label each directory's listing
                output.push(
                    `${target}:`
                );
            }

            output.push(
                listDirectory(
                    node,
                    target === ROOT ? "" : `${target}/`
                )
            );
        }

        return {
            stdout: output.join("\n"),
            stderr: errors.join("\n"),
            exitCode: errors.length ? 1 : 0
        };
    }
});
