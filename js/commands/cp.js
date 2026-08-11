/**
 * `cp` command.
 * Deep-clones the source file/directory node (via structuredClone, which
 * naturally handles directories recursively since children is a nested
 * plain object) and attaches the clone at the destination, refreshing its
 * timestamps. Refuses to overwrite an existing destination.
 */
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
    async execute(terminal, args, stdin) {
        // Print usage info and exit early when --help is passed
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
        
        const src = terminal.fs.getParent(source, terminal.cwd);
        const dest = terminal.fs.getParent(destination, terminal.cwd);

        if (!src || !dest) {
            return {
                stdout: "",
                stderr: `cp: invalid path`,
                exitCode: 1
            };    
        }

        if (!src.parent.children[src.name]) {
            return {
                stdout: "",
                stderr: `cp: cannot stat '${source}': No such file or directory`,
                exitCode: 1
            };
        }

        if (dest.parent.children[dest.name]) {
            // Destination already exists - refuse rather than silently overwrite
            return {
                stdout: "",
                stderr: `cp: ${destination}: already exists`,
                exitCode: 1
            };    
        }

        src.parent.modified = Date.now();
        dest.parent.modified = Date.now();

        // Deep clone so the copy is fully independent of the original
        // (structuredClone recurses through `children` for directories)
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
