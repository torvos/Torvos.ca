registerCommand("touch", {
    name: "Create files or update timestamps.",
    synopsis : "touch [FILE]",
    description: "is primarily used to create empty files and update file timestamps (access time and modification time).",
    options: [],
    examples: [
        "touch myfile.txt"
    ],
    execute(terminal, args, stdin) {
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
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