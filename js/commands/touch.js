registerCommand("touch", {
    name: "Create files or update timestamps.",
    synopsis : "touch [FILE]",
    description: "is primarily used to create empty files and update file timestamps (access time and modification time).",
    options: [],
    examples: [
        "touch myfile.txt"
    ],
    async execute(terminal, args, stdin) {
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
        if(terminal.fs.isInBin(target, terminal.cwd)){
            return {
                stdout: "",
                stderr: `touch: cannot create file in /bin`,
                exitCode: 1
            };
        }

        const node = terminal.fs.get(target, terminal.cwd);
        if (node){
            return {
                stdout: "",
                stderr: `touch: file ${target} already exists`,
                exitCode: 1
            };           
        }

        const result = terminal.fs.getParent(target, terminal.cwd);

        if (!result) {
            return {
                stdout: "",
                stderr: `touch: invalid path ${target}`,
                exitCode: 1
            };           
        }

        result.parent.modified = Date.now();
        result.parent.children[result.name] = terminal.fs.createFile(result.name.startsWith("."));

        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };    
    }
});