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
        "chmod -R 755 /home/guest",
        "chmod u+x script.sh",
        "chmod u+rwx,g-w,o= notes.txt"
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
        // chmod's mode argument can itself start with "-" (e.g. "-w",
        // "-rwx" to remove permissions), so it can't be run through the
        // generic terminal.parseFlags() the way most commands' options
        // are - that would misinterpret the mode as an unknown flag and
        // swallow it. chmod only has one real flag ("-R"), so it's pulled
        // out directly instead; everything else is positional regardless
        // of whether it happens to start with "-".
        const recursive = args.includes("-R");
        const positional = args.filter(arg => arg !== "-R");

        if (positional.length < 2) {
            return {
                stdout: "",
                stderr: "chmod: missing operand",
                exitCode: EXIT_FAILURE
            };
        }

        const mode = positional[0];
        const paths = positional.slice(1);
        let funcStdout = "";
        let funcStderr = "";
        let funcExitCode = EXIT_SUCCESS;

        const isNumericMode = /^[0-7]{3,4}$/.test(mode);

        // Validate the mode string once, up front, against a placeholder
        // starting mode - rather than after already having (potentially
        // partially) applied it to real files. Matches real chmod: a bad
        // mode string is rejected outright with a clear error and touches
        // nothing, instead of silently doing nothing (or, worse, silently
        // corrupting a node's mode with the invalid result).
        if (!isNumericMode && terminal.fs.symbolicToMode("---------", mode) === null) {
            return {
                stdout: "",
                stderr: `chmod: invalid mode: '${mode}'`,
                exitCode: EXIT_FAILURE
            };
        }

        // Applies `mode` to a single node, detecting numeric ("755") vs
        // symbolic ("u+x") syntax and delegating to the matching fs helper.
        function applyMode(node) {
            if (!node.mode) {
                node.mode = "---------";
            }
            if (isNumericMode) {
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
                funcExitCode = EXIT_FAILURE;
                continue;
            }
            // Structural change (permission bits) - always blocked for
            // protected system paths, devices included: a device's mode
            // string is cosmetic display only, not something a guest
            // should be able to change.
            if (terminal.fs.isProtected(path, terminal.cwd)) {
                funcStderr += `chmod: changing permissions of '${path}': Permission denied\n`;
                funcExitCode = EXIT_FAILURE;
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
