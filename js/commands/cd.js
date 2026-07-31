registerCommand("cd", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        const target = args[0];
        if (!target) {
            return {
                stdout: "",
                stderr: "cd: missing operand",
                exitCode: 1
            }; 

        }

        let newPath = resolveRelativePath(terminal.cwd, target);
        let result = resolvePath(newPath);
        
        if(args[0] === "-"){
            newPath = resolveRelativePath(terminal.cwd, terminal.env.OLDPWD);
            result = resolvePath(newPath);    
        }

        if (!result) {
            return {
                stdout: "",
                stderr: `cd: no such file or directory: ${target}`,
                exitCode: 1
            };
        }

        if (result.node.type !== "dir") {
            return {
                stdout: "",
                stderr: `cd: not a directory: ${target}`,
                exitCode: 1
            };
        }

        result.node.accessed = Date.now();

        terminal.cwd = result.path;
        terminal.renderPrompt();

        terminal.env.OLDPWD = terminal.env.PWD;
        terminal.env.PWD = terminal.cwd;

        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };
    }
});