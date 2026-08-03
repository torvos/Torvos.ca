registerCommand("mkdir", {
    name: "Create directories.",
    synopsis : "mkdir [OPTIONS] DIRECTORY",
    description: "is used to create one or more new folders inside your file system.",
    options: [
        "-p    create all directorys in a chain"
    ],
    examples: [
        "mkdir test",
        "mkdir -p /test1/test2/test3"
    ],
    async execute(terminal, args, stdin) {
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        const parsed = terminal.parseFlags(args, { p: false });
        const parents = parsed.flags.has("p");
        const target = parsed.args[0];

        if (!target) {
            return {
                stdout: "",
                stderr: "mkdir: missing operand",
                exitCode: 1
            };        

        }

        const path = terminal.fs.getFullPath(target, terminal.cwd);

        function mkdirRecursive(path) {
            const parts = path.split(ROOT).filter(Boolean);
            let currentPath = "";

            for (const part of parts) {
                currentPath += ROOT + part;

                const node = terminal.fs.get(currentPath, terminal.cwd);

                if (node) {
                    if (!terminal.fs.isDirectory(node)) {
                        return {
                            stdout: "",
                            stderr: `mkdir: ${part}: Not a directory`,
                            exitCode: 1
                        };        

                    }
                    continue;
                }

                const result = terminal.fs.getParent(currentPath, terminal.cwd);

                if (!result) {
                    return {
                        stdout: "",
                        stderr: `mkdir: invalid path ${currentPath}`,
                        exitCode: 1
                    };        
                }
                result.parent.modified = Date.now();
                result.parent.children[result.name] = terminal.fs.createDirectory(result.name.startsWith("."));
            }

            return {
                stdout: "",
                stderr: "",
                exitCode: 0
            };     
        }
        
        if (parents) {
            return mkdirRecursive(path);
        }

        const node = terminal.fs.get(path, terminal.cwd);

        if (node) {
            return {
                stdout: "",
                stderr: `mkdir: directory ${target} already exists`,
                exitCode: 1
            };           
        }

        const result = terminal.fs.getParent(path, terminal.cwd);

        if (!result) {
            return {
                stdout: "",
                stderr: `mkdir: cannot create directory '${target}': No such file or directory`,
                exitCode: 1
            };           
        }
        
        result.parent.modified = Date.now();
        result.parent.children[result.name] = terminal.fs.createDirectory(result.name.startsWith("."));
        
        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };
    }
});