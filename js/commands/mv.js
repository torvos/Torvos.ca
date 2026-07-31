registerCommand("mv", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        let source = args[0];
        let destination = args[1];

        if (source === undefined || destination === undefined) {
            return {
                stdout: "",
                stderr: `mv: missing operand`,
                exitCode: 1
            };           
        }

        const sourcePath = resolveRelativePath(terminal.cwd, source);
        const destinationPath = resolveRelativePath(terminal.cwd, destination);

        const src = getParentDirectory(sourcePath);
        const dest = getParentDirectory(destinationPath);

        if (!src || !dest) {
            return {
                stdout: "",
                stderr: `mv: invalid path`,
                exitCode: 1
            };   
        }

        if (dest.parent.children[dest.name]) {
            return {
                stdout: "",
                stderr: `mv: ${destination}: already exists`,
                exitCode: 1
            };           
        }

        src.parent.modified = Date.now();
        dest.parent.modified = Date.now();

        dest.parent.children[dest.name] = src.parent.children[src.name];

        delete src.parent.children[src.name];

        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };
    }    
});