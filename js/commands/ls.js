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

        // Parallel arrays: one plain-text line per entry in `lines`, and
        // the same line's colored { text, color } segments (or undefined,
        // for lines that don't need coloring) in `lineSegments`. Kept
        // strictly parallel/flat throughout so stdout/stdoutSegments never
        // drift out of sync, even across -R's recursive nesting.
        let lines = [];
        let lineSegments = [];
        let errors = [];

        // Returns the color a single entry's name should render in - blue
        // for directories, cyan for symlinks, yellow for device files,
        // default for regular files - mirroring a real `ls --color` listing.
        function colorFor(child) {
            if (terminal.fs.isDirectory(child)) return COLOR_DIRECTORY;
            if (terminal.fs.isSymlink(child)) return COLOR_SYMLINK;
            if (terminal.fs.isDevice(child)) return COLOR_DEVICE;
            return undefined;
        }

        // Splits a formatLongEntry() line into its non-colored prefix and
        // the colored "name portion" (name + any trailing "/" or
        // "-> target"). This is computed from known, fixed-length pieces
        // rather than searching the line for `name` - a plain
        // `line.lastIndexOf(name)` looks correct at a glance, but breaks
        // whenever the name happens to reappear later in the line, e.g. a
        // symlink named "test" pointing at "test2" formats as
        // "... test -> test2", and lastIndexOf("test") finds the "test"
        // INSIDE "test2" instead of the real name - which then colors
        // "test2" as if it were the entry's name and leaves the actual
        // name uncolored.
        function splitLongEntryName(line, name, node) {
            const suffix =
                (node.type === "dir" ? "/" : "") +
                (node.type === "symlink" ? ` -> ${node.target}` : "");
            const nameIndex = line.length - name.length - suffix.length;
            return [
                { text: line.slice(0, nameIndex), color: COLOR_STDOUT },
                { text: line.slice(nameIndex), color: colorFor(node) ?? COLOR_STDOUT }
            ];
        }

        /**
         * Appends the listing for a single directory node to `lines`/
         * `lineSegments`. Recurses into subdirectories (appending their
         * own listings, headed by their path) when -R is set.
         * @param {Object} dirNode - The directory's filesystem node.
         * @param {string} dirPath - This directory's display path prefix
         *   (used to build child paths for recursive listings).
         */
        function listDirectory(dirNode, dirPath) {
            dirNode.accessed = Date.now();
            const children = dirNode.children || {};
            const keys = Object.keys(children);

            // Names/segments for this directory's own entries, collected
            // separately so the short format can pack them onto one line.
            let names = [];
            let nameSegments = [];
            let directories = [];

            keys.forEach(name => {
                const child = children[name];
                if (child.hidden && !showHidden) {
                    return;
                }

                if (longFormat) {
                    const line = terminal.fs.formatLongEntry(name, child);
                    names.push(line);
                    nameSegments.push(splitLongEntryName(line, name, child));
                }
                else {
                    // Short format: just the name, with a trailing "/" for directories
                    const entryColor = colorFor(child);
                    const label = terminal.fs.isDirectory(child)
                        ? `${name}/`
                        : name;
                    names.push(label);
                    nameSegments.push([{ text: label, color: entryColor ?? COLOR_STDOUT }]);
                }
                if (terminal.fs.isDirectory(child)) {
                    directories.push({ name, node: child });
                }
            });

            if (longFormat || recursive) {
                // One entry per physical line.
                if (names.length) {
                    names.forEach((name, i) => {
                        lines.push(name);
                        lineSegments.push(nameSegments[i]);
                    });
                } else {
                    // Empty directory: preserve the blank line a real `ls`
                    // listing leaves between two target headers.
                    lines.push("");
                    lineSegments.push(undefined);
                }
            } else if (names.length) {
                // Short format packs every entry onto a single physical
                // line, joined by "  " (also just a plain segment).
                lines.push(names.join("  "));
                const packed = [];
                nameSegments.forEach((segs, i) => {
                    if (i > 0) packed.push({ text: "  ", color: COLOR_STDOUT });
                    packed.push(...segs);
                });
                lineSegments.push(packed);
            } else {
                // Empty directory, short format: same blank-line placeholder.
                lines.push("");
                lineSegments.push(undefined);
            }

            if (recursive) {
                // Append each subdirectory's own listing, with a blank line
                // and a "path:" header, mimicking real `ls -R` output
                directories.forEach(dir => {
                    lines.push("");
                    lineSegments.push(undefined);
                    lines.push(`${dirPath}${dir.name}:`);
                    lineSegments.push(undefined);
                    listDirectory(dir.node, `${dirPath}${dir.name}/`);
                });
            }
        }

        for (const target of targets) {
            // Look up the RAW entry first (without following a trailing
            // symlink) so a symlink pointing at a file/device can show its
            // OWN line below (type "l", its own mode, "-> target") instead
            // of silently being replaced by whatever it points to - real
            // `ls` only follows a symlink for display purposes when it
            // points at a directory (to list that directory's contents);
            // for anything else it shows the link itself.
            const fullPath = terminal.fs.getFullPath(target, terminal.cwd);
            const rawEntry = fullPath === ROOT ? null : terminal.fs.getParent(target, terminal.cwd);
            const rawNode = rawEntry ? rawEntry.parent.children[rawEntry.name] : null;

            if (rawNode && terminal.fs.isSymlink(rawNode)) {
                const resolved = terminal.fs.get(target, terminal.cwd);
                if (!resolved || !terminal.fs.isDirectory(resolved)) {
                    // Symlink to a non-directory (or a dangling symlink) -
                    // show the symlink's own info, don't follow it
                    const label = target.split(ROOT).pop();
                    if (longFormat) {
                        const line = terminal.fs.formatLongEntry(label, rawNode);
                        lines.push(line);
                        lineSegments.push(splitLongEntryName(line, label, rawNode));
                    } else {
                        lines.push(label);
                        lineSegments.push([{ text: label, color: colorFor(rawNode) ?? COLOR_STDOUT }]);
                    }
                    continue;
                }
                // Else: a symlink to a directory - fall through below and
                // follow it, same as real `ls` does by default.
            }

            const node = terminal.fs.get(target, terminal.cwd);

            if (!node) {
                errors.push(
                    `ls: cannot access '${target}': No such file or directory`
                );
                continue;
            }

            if (terminal.fs.isFile(node) || terminal.fs.isDevice(node)) {
                // Listing a file/device directly just prints that one entry
                const label = target.split(ROOT).pop();
                if (longFormat) {
                    const line = terminal.fs.formatLongEntry(label, node);
                    lines.push(line);
                    lineSegments.push(splitLongEntryName(line, label, node));
                }
                else {
                    lines.push(label);
                    lineSegments.push([{ text: label, color: colorFor(node) ?? COLOR_STDOUT }]);
                }
                continue;
            }

            if (targets.length > 1) {
                // Multiple targets given - label each directory's listing
                lines.push(`${target}:`);
                lineSegments.push(undefined);
            }

            listDirectory(
                node,
                target === ROOT ? "" : `${target}/`
            );
        }

        return {
            stdout: lines.join("\n"),
            stdoutSegments: lineSegments,
            stderr: errors.join("\n"),
            exitCode: errors.length ? 1 : 0
        };
    }
});
