registerCommand("mv", {
    name: "Move or rename files/directories.",
    synopsis : "mv [OPTIONS] SOURCE DESTINATION",
    description: "is a fundamental Linux utility used to move or rename files and directories. Unlike copying, mv permanently alters the source file's location or name without creating a duplicate.",
    options: [],
    examples: [
        "mv resumer.md cv.txt"
    ],
    async execute(terminal, args, stdin) {
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }        
        let source = args[0];
        let destination = args[1];

        if (source === undefined || destination === undefined) {
            return {
                stdout: "",
                stderr: `mv: missing operand`,
                exitCode: 1
            };           
        }

        const src = terminal.fs.getParent(source, terminal.cwd);
        const dest = terminal.fs.getParent(destination, terminal.cwd);

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