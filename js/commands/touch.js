registerCommand("touch", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        let target = args[0];

        if (target === undefined) {
            return {
                stdout: "",
                stderr: `touch: missing operand`,
                exitCode: 1
            };           
        }
        const path = resolveRelativePath(terminal.cwd, target);

        if(path.includes("/bin/")){
            return {
                stdout: "",
                stderr: `touch: cannot create file in /bin`,
                exitCode: 1
            };
        }

        let pathresult = resolvePath(path);

        const node = pathresult ? pathresult.node : null;
        if (node){
            return {
                stdout: "",
                stderr: `touch: file ${target} already exists`,
                exitCode: 1
            };           
        }

        const result = getParentDirectory(path);

        if (!result) {
            return {
                stdout: "",
                stderr: `touch: invalid path ${target}`,
                exitCode: 1
            };           
        }

        result.parent.modified = Date.now();
        result.parent.children[result.name] = createFile(result.name.startsWith("."));

        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };    
    }
});