registerCommand("chmod", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
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
            const fullPath = resolveRelativePath(terminal.cwd, path);
            const node = resolvePath(fullPath);
            if (!node) {
                stderr += `chmod: ${path}: No such file or directory\n`;
                exitCode = 1;
                continue;
            }
            if(fullPath.includes("/bin/")){
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