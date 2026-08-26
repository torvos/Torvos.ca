/**
 * `rmdir` command.
 * Removes a directory, but only if it's completely empty - refuses (with
 * an error) if it still has children, is a file, or doesn't exist.
 */
registerCommand("rmdir", {
    name: "Remove empty directories.",
    synopsis : "rmdir DIRECTORY_NAME ",
    description: "is used exclusively to remove empty directories from the filesystem. It acts as a safety mechanism, failing completely if the folder contains any files or subdirectories to prevent accidental data loss.",
    // Tells the executor to persist the filesystem after this command
    // runs - see the `mutatesFilesystem` check in execute.js.
    mutatesFilesystem: true,
    options: [],
    examples: [
        "rmdir test",
        "rmdir Documents"
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
        const targets = args.filter(a => a !== "--help");
        if (targets.length === 0) {
            return {
                stdout: "",
                stderr: `rmdir: missing operand`,
                exitCode: 1
            };          
        }

        // Removes a single target, returning an error message string on
        // failure or null on success - errors accumulate across targets
        // (e.g. `rmdir *` shouldn't stop at the first non-empty directory).
        function removeOne(target) {
            const node = terminal.fs.get(target, terminal.cwd);
            if (!node) {
                return `rmdir: directory ${target} not found`;
            }
            if (terminal.fs.isProtected(target, terminal.cwd)) {
                return `rmdir: failed to remove ${target}: Permission denied`;
            }
            if (terminal.fs.isDirectory(node)) {
                if (Object.keys(node.children).length > 0) {
                    // Not empty - refuse to remove (rmdir's core safety behavior)
                    return `rmdir: failed to remove ${target}: Directory not empty`;
                }
                const result = terminal.fs.getParent(target, terminal.cwd);
                if (!result) {
                    return `rmdir: directory ${target} not found`;
                }
                result.parent.modified = Date.now();
                delete result.parent.children[result.name];
                return null;
            }
            if (terminal.fs.isFile(node)) {
                // Point the user toward `rm` for files
                return `rmdir: ${target} is a file please use rm`;
            }
            return `rmdir: failed to remove '${target}': Not a directory`;
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
