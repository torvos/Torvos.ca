registerCommand("find", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        const parsed = terminal.parseFlags(args, {name: true, type: true, maxdepth: true});
        const namePattern = parsed.options?.name ?? null;
        const typeFilter = parsed.options?.type ?? null;
        const maxDepth = parsed.options?.maxdepth !== undefined ? parseInt(parsed.options.maxdepth, 10) : Infinity;
        const regex = namePattern ? new RegExp("^" + namePattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".") + "$"): null;

        const target = parsed.args[0] || terminal.cwd;
        const path = resolveRelativePath(terminal.cwd, target);
        let pathresult = resolvePath(path);
        const root = pathresult ? pathresult.node : null;

        if (!root) {
            return {
                stdout: "",
                stderr: `find: '${target}': No such starting directory`,
                exitCode: 1
            };
        }

        function walk(node, path = terminal.cwd, depth = 1) {
            if(path === "/"){
                path = "";
            }
            let output = "";
            if (depth > maxDepth || !node.children) {
                return output;
            }
            let keys = Object.keys(node.children);
            keys.forEach((key, index) => {
                const child = node.children[key];
                if (typeFilter === "f"){
                    if(child.type === "file"){
                        if(namePattern){
                            if(regex.test(key)){
                                output += `${path}/${key}\n`;
                            }
                        }
                        else{
                            output += `${path}/${key}\n`;
                        }
                    }
                }                
                else if (typeFilter === "d"){
                    if(child.type === "dir"){
                        if(namePattern){
                            if(regex.test(key)){
                                output += `${path}/${key}\n`;
                            }                        
                        }
                        else{
                            output += `${path}/${key}\n`;
                        }
                    }
                }
                else{
                    if(namePattern){
                        if(regex.test(key)){
                            output += `${path}/${key}\n`;
                        }                    
                    }
                    else{
                        output += `${path}/${key}\n`;
                    }
                }
                if (child.type === "dir" && depth < maxDepth) {
                    const nextPath = path + "/" + key;
                    output += walk(child, nextPath, depth + 1);
                }
            });
            return output;
        }

        return {
            stdout: walk(root, path).replace(/\r?\n$/, ""),
            stderr: "",
            exitCode: 0
        };
    }
});