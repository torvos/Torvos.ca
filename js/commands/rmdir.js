registerCommand("rmdir", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        let target = args[0];
        if (target === undefined) {
            return {
                stdout: "",
                stderr: `rmdir: missing operand`,
                exitCode: 1
            };          
        }
        const path = resolveRelativePath(terminal.cwd, target);
        let pathresult = resolvePath(path);

        const node = pathresult ? pathresult.node : null;
        if (!node){
            return {
                stdout: "",
                stderr: `rmdir: directory ${target} not found`,
                exitCode: 1
            };          
        }
        if (node && node.type === "dir"){
            if (Object.keys(node.children).length > 0) {
                return {
                    stdout: "",
                    stderr: `rmdir: failed to remove ${target}: Directory not empty`,
                    exitCode: 1
                };           
            }
            else{
                const path = resolveRelativePath(terminal.cwd, target);
                const result = getParentDirectory(path);

                if (!result) {
                    return {
                        stdout: "",
                        stderr: `rmdir: directory ${target} not found`,
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
        }
        else if (node.type === "file"){
            return {
                stdout: "",
                stderr: `rmdir: ${target} is a file please use rm`,
                exitCode: 1
            };           

        }
    }
});