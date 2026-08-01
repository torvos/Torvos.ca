registerCommand("cp", {
    name: "Copy files and directories.",
    synopsis : "cp SOURCE... DESTINATION",
    description: "Copy one or more files to another location. Directories may be copied recursively using the recursive option.",
    options: [],
    examples: [
        "cp notes.txt backup.txt",
        "cp *.txt backup/",
        "cp -R Documents Archive"
    ],
    execute(terminal, args, stdin) {
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
                stderr: `cp: missing operand`,
                exitCode: 1
            };    
        }
        
        const sourcePath = terminal.fs.getFullPath(source, terminal.cwd);
        const src = getParentDirectory(sourcePath);
        const destinationPath = terminal.fs.getFullPath(destination, terminal.cwd);
        const dest = getParentDirectory(destinationPath);

        if (!src || !dest) {
            return {
                stdout: "",
                stderr: `cp: invalid path`,
                exitCode: 1
            };    
        }

        if (dest.parent.children[dest.name]) {
            return {
                stdout: "",
                stderr: `cp: ${destination}: already exists`,
                exitCode: 1
            };    
        }

        src.parent.modified = Date.now();
        dest.parent.modified = Date.now();

        const copy = structuredClone(src.parent.children[src.name]);
        const now = Date.now();
        copy.created = now;
        copy.modified = now;
        copy.accessed = now;
        dest.parent.children[dest.name] = copy;

        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };
    }
});