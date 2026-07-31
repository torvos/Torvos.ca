registerCommand("mkdir", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
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

        const path = resolveRelativePath(terminal.cwd, target);

        function mkdirRecursive(path) {
            const parts = path.split(ROOT).filter(Boolean);
            let currentPath = "";

            for (const part of parts) {
                currentPath += ROOT + part;

                let pathresult = resolvePath(currentPath);

                const node = pathresult ? pathresult.node : null;

                if (node) {
                    if (node.type !== "dir") {
                        return {
                            stdout: "",
                            stderr: `mkdir: ${part}: Not a directory`,
                            exitCode: 1
                        };        

                    }
                    continue;
                }

                const result = getParentDirectory(currentPath);

                if (!result) {
                    return {
                        stdout: "",
                        stderr: `mkdir: invalid path ${currentPath}`,
                        exitCode: 1
                    };        
                }
                result.parent.modified = Date.now();
                result.parent.children[result.name] = createDirectory(result.name.startsWith("."));
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

        let pathresult = resolvePath(path);
        const node = pathresult ? pathresult.node : null;

        if (node) {
            return {
                stdout: "",
                stderr: `mkdir: directory ${target} already exists`,
                exitCode: 1
            };           
        }

        const result = getParentDirectory(path);

        if (!result) {
            return {
                stdout: "",
                stderr: `mkdir: cannot create directory '${target}': No such file or directory`,
                exitCode: 1
            };           
        }
        
        result.parent.modified = Date.now();
        result.parent.children[result.name] = createDirectory(result.name.startsWith("."));
        
        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };
    }
});