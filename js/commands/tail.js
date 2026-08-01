registerCommand("tail", {
    name: "Display the last lines of a file.",
    synopsis : "tail [OPTIONS] FILE...",
    description: "is a built-in utility that outputs the last part (by default, the last 10 lines) of one or more text files to the terminal. It is a foundational tool for system administrators and developers to quickly preview large configuration files, logs, or datasets without opening a full text editor.",
    options: [
        "-n #  number of lines to display"
    ],
    examples: [
        "tail file.txt",
        "tail -n 20 file.txt"
    ],
    execute(terminal, args, stdin) {    
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
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
