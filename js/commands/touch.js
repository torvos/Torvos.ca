/**
 * `touch` command.
 * If the target already exists, updates its modified/accessed timestamps.
 * Otherwise, creates a new empty file in the target's parent directory
 * (auto-marking it hidden if the name starts with ".").
 */
registerCommand("touch", {
    name: "Create files or update timestamps.",
    synopsis : "touch [FILE]",
    description: "is primarily used to create empty files and update file timestamps (access time and modification time).",
    options: [],
    examples: [
        "touch myfile.txt"
    ],
    async execute(terminal, args, stdin) {
        // Print usage info and exit early when --help is passed
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
            // File/dir already exists - just bump its timestamps
            node.modified = Date.now();
            node.accessed = Date.now();
            return {
                stdout: "",
                stderr: "",
                exitCode: 0
            };           
        }

        // Doesn't exist yet - find its parent directory to create it in
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
