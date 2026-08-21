/**
 * `rm` command.
 * Removes a file, symlink, or (with -r) a directory and everything under
 * it. Refuses to remove directories without -r, and refuses to remove
 * "/" entirely regardless of flags. With -f, a missing target is treated
 * as success rather than an error (matches real `rm -f` semantics).
 */
registerCommand("rm", {
    name: "Remove files/directories.",
    synopsis : "rm [OPTIONS] FILE_OR_DIRECTORY",
    description: "is used to permanently delete files and directories from the filesystem.",
    options: [
        "-f    force the deletion of the files or directory.",
        "-r    apply permissions recursively to contents of a folder."
    ],
    examples: [
        "rm -rf /",
        "rm resume.md"
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
        const parsed = terminal.parseFlags(args,{f: false,r: false});
        const force = parsed.flags.has("f");
        const recursive = parsed.flags.has("r");
        const targets = parsed.args;

        if (targets.length === 0) {
            return {
                stdout: "",
                stderr: `rm: missing operand`,
                exitCode: 1
            };    
        }

        // Recursively deletes every descendant entry of `dir` before the
        // directory itself gets removed by the caller below.
        function removeChildren(dir) {
            if (!dir.children) {
                return;
            }

            for (const key of Object.keys(dir.children)) {
                const child = dir.children[key];

                if (terminal.fs.isDirectory(child)) {
                    removeChildren(child);
                }

                delete dir.children[key];
            }
        }

        // Removes a single target, returning an error message string on
        // failure or null on success. Errors are collected by the loop
        // below rather than aborting the whole command - like real `rm`,
        // one bad target (e.g. a wildcard match that's a directory,
        // hit without -r) shouldn't stop the rest from being removed.
        function removeOne(target) {
            if (target === ROOT) {
                // Hard-coded guard: never allow deleting the filesystem root
                return "rm: prohibited to use on '/'";
            }

            // Structural (deletes the entry) - always blocked for protected
            // system paths, devices included: `rm /dev/null` shouldn't work
            // even though /dev/null itself is happy to be written *through*.
            if (terminal.fs.isProtected(target, terminal.cwd)) {
                return `rm: cannot remove '${target}': Permission denied`;
            }

            const result = terminal.fs.getParent(target, terminal.cwd);

            if (!result || !result.parent.children[result.name]) {
                if (force) {
                    // -f: missing target is silently treated as success
                    return null;
                }
                return `rm: cannot remove '${target}': No such file or directory`;
            }

            const node = result.parent.children[result.name];

            if (terminal.fs.isSymlink(node)) {
                // Symlinks themselves are removed directly (their target is untouched)
                result.parent.modified = Date.now();
                delete result.parent.children[result.name];
                return null;
            }

            if (terminal.fs.isDirectory(node)) {
                if (!recursive) {
                    return `rm: cannot remove '${target}': Is a directory`;
                }
                removeChildren(node);
                result.parent.modified = Date.now();
                delete result.parent.children[result.name];
                return null;
            }

            // Plain file
            result.parent.modified = Date.now();
            delete result.parent.children[result.name];
            return null;
        }

        const errors = [];
        for (const target of targets) {
            const error = removeOne(target);
            if (error) {
                errors.push(error);
            }
        }

        return {
            stdout: "",
            stderr: errors.join("\n"),
            exitCode: errors.length ? 1 : 0
        };
    }
});
