registerCommand("edit", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        const target = args[0];
        if (!target){
            return {
                stdout: "",
                stderr: "edit: missing operand",
                exitCode: 1
            };        
        }

        const path = resolveRelativePath(terminal.cwd,target);
        let pathresult = resolvePath(path);
        let node;

        if (!pathresult) {
            const result = getParentDirectory(path);
            if (!result) {
                return {
                    stdout:"",
                    stderr:`edit: invalid path ${target}`,
                    exitCode:1
                };
            }
            result.parent.children[result.name] = createFile(result.name.startsWith("."));
            node = result.parent.children[result.name];        
        } else {
            if(!pathresult.path.includes("/bin/")){
                node = pathresult.node;
            }
            else{
                return {
                    stdout: "",
                    stderr: `edit: cannot open file in /bin`,
                    exitCode: 1
                };
            }
            if (node.type === "dir") {
                return {
                    stdout: "",
                    stderr: `edit: ${target}: is a directory`,
                    exitCode: 1
                };
            }
        }

        terminal.openEditor(node, path);

        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };
    }
});
