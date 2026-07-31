registerCommand("tail", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {    
        const parsed = terminal.parseFlags(args,{n: true});
        const maxDepth = parsed.options?.n !== undefined
            ? parseInt(parsed.options.n, 10)
            : 10;
        const target = parsed.args[0];
        
        let content = "";

        if (!target) {

            if (!stdin) {
                return {
                    stdout: "",
                    stderr: "tail: missing file operand",
                    exitCode: 1
                };
            }

            content = stdin;

        } else {

            const fullPath = resolveRelativePath(terminal.cwd, target);
            let pathresult = resolvePath(fullPath);

            const node = pathresult ? pathresult.node : null;
            if (!node) {
                return {
                    stdout: "",
                    stderr: `tail: no such file: ${target}`,
                    exitCode: 1
                };
            }

            if (node.type === "dir") {
                return {
                    stdout: "",
                    stderr: `tail: ${target}: is a directory`,
                    exitCode: 1
                };
            }

            node.accessed = Date.now();
            content = node.content;
        }


        return {
            stdout: content
                .split(/\r?\n/)
                .slice(-maxDepth)
                .join("\n"),

            stderr: "",
            exitCode: 0
        };
    }
});
