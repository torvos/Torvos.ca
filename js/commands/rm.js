registerCommand("rm", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {    
        const parsed = terminal.parseFlags(args,{f: false,r: false});
        const force = parsed.flags.has("f");
        const recursive = parsed.flags.has("r");
        const target = parsed.args[0];

        if (target === undefined) {
            return {
                stdout: "",
                stderr: `rm: missing operand`,
                exitCode: 1
            };    
        }

        const path = resolveRelativePath(terminal.cwd, target);
        const result = getParentDirectory(path);

        if (!result || !result.parent.children[result.name]) {
            if (force) {
                return {
                    stdout: "",
                    stderr: "",
                    exitCode: 0
                };    
            }
            return {
                stdout: "",
                stderr: `rm: cannot remove '${target}': No such file or directory`,
                exitCode: 1
            };   
        }

        const node = result.parent.children[result.name];

        if (node.type === "file" || node.type === "symlink") {
            delete result.parent.children[result.name];
            return {
                stdout: "",
                stderr: "",
                exitCode: 0
            };   
        }

        if (!force) {
            return {
                stdout: "",
                stderr: `rm: ${target} is a directory please use rmdir`,
                exitCode: 1
            };                  
        }

        if (recursive) {
            function removeChildren(dir) {
                if (!dir.children) {
                    return {
                        stdout: "",
                        stderr: "",
                        exitCode: 0
                    };
                }

                for (const key of Object.keys(dir.children)) {
                    const child = dir.children[key];

                    if (child.type === "dir") {
                        removeChildren(child);
                    }

                    delete dir.children[key];
                }
            }

            if(target === ROOT){
                return {
                    stdout: "",
                    stderr: "rm: it is dangerous to operate recursively on '/'",
                    exitCode: 1
                };          
            }
            removeChildren(node);
        }
        else if (Object.keys(node.children).length > 0) {
            return {
                stdout: "",
                stderr: `rm: cannot remove '${target}': Directory not empty`,
                exitCode: 1
            };          
        }

        result.parent.modified = Date.now();
        delete result.parent.children[result.name];    

        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };    
    }
});