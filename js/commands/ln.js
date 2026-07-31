registerCommand("ln", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        const parsed = terminal.parseFlags(args,{s: false});
        const SymbolicLink = parsed.flags.has("s");
        const target = parsed.args[0];
        const link = parsed.args[1];

        if(!SymbolicLink){
            return {
                stdout: "",
                stderr: "ln: Hard links are not supported use -s",
                exitCode: 1
            };         
        }
        else{
            if(target !== null && target !== undefined || link !== null && link !== undefined){
                
                const targetPath = resolveRelativePath(terminal.cwd, target);
                if(targetPath.includes("/bin/")){
                    return {
                        stdout: "",
                        stderr: `ln: cannot create link in /bin`,
                        exitCode: 1
                    };
                }            
                const tpathresult = resolvePath(targetPath);
                const targetNode = tpathresult ? tpathresult.node : null;

                const linkPath = resolveRelativePath(terminal.cwd, link);
                const lpathresult = resolvePath(linkPath);
                const linkNode = lpathresult ? lpathresult.node : null;

                if (!targetNode) {
                    return {
                        stdout:"",
                        stderr:`ln: ${target}: No such file or directory`,
                        exitCode:1
                    };
                }            
                if (targetNode){
                    return {
                        stdout: "",
                        stderr: `ln: ${target} already exists`,
                        exitCode: 1
                    };           
                }
                if (!linkNode){
                    return {
                        stdout: "",
                        stderr: `ln: ${link} doesnt exists`,
                        exitCode: 1
                    };           
                }

                const result = getParentDirectory(targetPath);
                if (!result) {
                    return {
                        stdout: "",
                        stderr: `ln: invalid path ${target}`,
                        exitCode: 1
                    };           
                }

                result.parent.modified = Date.now();
                result.parent.children[result.name] = createLink(linkPath);
            }
            else{
                return {
                    stdout: "",
                    stderr: "ln: missing operand",
                    exitCode: 1
                };               
            }
        }
        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };    
    }
});