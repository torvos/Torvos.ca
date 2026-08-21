/**
 * `edit` command.
 * Opens the target file in the full-screen editor (see js/terminal/editor.js).
 * If the file doesn't exist yet, creates a new empty one first (as long as
 * its parent directory exists) so `edit` doubles as "create and edit".
 */
registerCommand("edit", {
    name: "Open a file in the built-in editor.",
    synopsis : "edit FILE",
    description: "Open an existing file or create a new one using the terminal's integrated text editor.",
    options: [],
    examples: [
        "edit notes.txt"
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
            // File doesn't exist - create it (in its parent directory) first
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
            node = pathresult.node;

            if (terminal.fs.isDevice(node)) {
                // Editing a device (e.g. /dev/random) interactively doesn't
                // make sense - its content is generated on read, not
                // stored - so this gets its own specific message rather
                // than the generic "protected" one below.
                return {
                    stdout: "",
                    stderr: `edit: ${target}: cannot edit a device file`,
                    exitCode: 1
                };
            }
            // Structural (opens the real file node for in-place editing) -
            // blocked for anything else under a protected system path,
            // e.g. /bin/ls.
            if (terminal.fs.isProtected(target, terminal.cwd)) {
                return {
                    stdout: "",
                    stderr: `edit: ${target}: Permission denied`,
                    exitCode: 1
                };
            }
            if (terminal.fs.isDirectory(node)) {
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
