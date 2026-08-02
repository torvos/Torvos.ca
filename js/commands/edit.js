registerCommand("edit", {
    name: "Open a file in the built-in editor.",
    synopsis : "edit FILE",
    description: "Open an existing file or create a new one using the terminal's integrated text editor.",
    options: [],
    examples: [
        "edit notes.txt"
    ],
    async execute(terminal, args, stdin) {
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        const target = args[0];
        if (!target){
            return {
                stdout: "",
                stderr: "edit: missing operand",
                exitCode: 1
            };        
        }

        const path = terminal.fs.getFullPath(target, terminal.cwd);
        let pathresult = terminal.fs.resolve(target, terminal.cwd);
        let node;

        if (!pathresult) {
            const result = terminal.fs.getParent(target, terminal.cwd);
            if (!result) {
                return {
                    stdout:"",
                    stderr:`edit: invalid path ${target}`,
                    exitCode:1
                };
            }
            result.parent.children[result.name] = terminal.fs.createFile(result.name.startsWith("."));
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
