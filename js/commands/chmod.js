registerCommand("chmod", {
    name: "Change file or directory permissions.",
    synopsis : "chmod [OPTIONS] MODE FILE...",
    description: "Modify the permission bits associated with one or more files or directories. Only symbolic or numeric modes supported by this shell are accepted.",
    options: [
        "-R    apply permissions recursively to contents of a folder."
    ],
    examples: [
        "chmod 755 script.sh",
        "chmod 644 notes.txt",
        "chmod -R 755 /home/guest"
    ],
    execute(terminal, args, stdin) {
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

        function applyMode(node) {
            if (!node.mode) {
                node.mode = "---------";
            }
            if (/^[0-7]{3,4}$/.test(mode)) {
                node.mode = numericToMode(mode);
            }
            else {
                node.mode = symbolicToMode(node.mode, mode);
            }
            node.modified = Date.now();
        }

        function chmodNode(wrapper) {
            const node = wrapper.node;
            const fileOwner = node.owner;
            if (fileOwner == DEFAULT_USER) {
                applyMode(node);
            }
            if (recursive && node.type === "dir" && node.children) {
            for (const child of Object.values(node.children)) {
                    chmodNode({
                        node: child
                    });
                }
            }
        }

        for (const path of paths) {
            const node = terminal.fs.get(path, terminal.cwd);
            if (!node) {
                stderr += `chmod: ${path}: No such file or directory\n`;
                exitCode = 1;
                continue;
            }
            if(terminal.fs.isInBin(path, terminal.cwd)){
                return {
                    stdout: "",
                    stderr: `chmod: cannot access files in /bin`,
                    exitCode: 1
                };
            }             
            chmodNode(node);
        }

        return {
            stdout: funcStdout,
            stderr: funcStderr,
            exitCode: funcExitCode
        };
    }
});