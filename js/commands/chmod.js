/**
 * `chmod` command.
 * Changes a file/directory's permission mode, accepting either a numeric
 * mode (e.g. "755") or a symbolic mode (e.g. "u+x"). With -R, recurses
 * into subdirectories. Only files owned by the guest user are actually
 * modifiable (mirrors real Unix permission ownership rules).
 */
registerCommand("chmod", {
    name: "Change file or directory permissions.",
    synopsis : "chmod [OPTIONS] MODE FILE...",
    description: "Modify the permission bits associated with one or more files or directories. Only symbolic or numeric modes supported by this shell are accepted.",
    // Tells the executor to persist the filesystem after this command
    // runs - see the `mutatesFilesystem` check in execute.js.
    mutatesFilesystem: true,
    options: [
        "-R    apply permissions recursively to contents of a folder."
    ],
    examples: [
        "chmod 755 script.sh",
        "chmod 644 notes.txt",
        "chmod -R 755 /home/guest"
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
        const parsed = terminal.parseFlags(args, { R: false });
        const recursive = parsed.flags.has("R");

        if (parsed.args.length < 2) {
            return {
                stdout: "",
                stderr: "chmod: missing operand",
                exitCode: 1
            };
        }

        const mode = parsed.args[0];
        const paths = parsed.args.slice(1);
        let funcStdout = "";
        let funcStderr = "";
        let funcExitCode = 0;

        // Applies `mode` to a single node, detecting numeric ("755") vs
        // symbolic ("u+x") syntax and delegating to the matching fs helper.
        function applyMode(node) {
            if (!node.mode) {
                node.mode = "---------";
            }
            if (/^[0-7]{3,4}$/.test(mode)) {
                node.mode = terminal.fs.numericToMode(mode);
            }
            else {
                node.mode = terminal.fs.symbolicToMode(node.mode, mode);
            }
            node.modified = Date.now();
        }

        // Applies the mode change to a node (if the guest user owns it),
        // then recurses into children when -R was passed.
        function chmodNode(wrapper) {
            const node = wrapper.node;
            const fileOwner = node.owner;
            if (fileOwner === DEFAULT_USER) {
                applyMode(node);
            }
            if (recursive && terminal.fs.isDirectory(node) && node.children) {
            for (const child of Object.values(node.children)) {
                    chmodNode({
                        node: child
                    });
                }
            }
        }

        // Process each target path, collecting per-path errors rather than
        // bailing out entirely on the first failure
        for (const path of paths) {
            const node = terminal.fs.get(path, terminal.cwd);
            if (!node) {
                funcStderr += `chmod: ${path}: No such file or directory\n`;
                funcExitCode = 1;
                continue;
            }
            // Structural change (permission bits) - always blocked for
            // protected system paths, devices included: a device's mode
            // string is cosmetic display only, not something a guest
            // should be able to change.
            if (terminal.fs.isProtected(path, terminal.cwd)) {
                funcStderr += `chmod: changing permissions of '${path}': Permission denied\n`;
                funcExitCode = 1;
                continue;
            }
            chmodNode({node});
        }

        return {
            stdout: funcStdout,
            stderr: funcStderr,
            exitCode: funcExitCode
        };
    }
});
