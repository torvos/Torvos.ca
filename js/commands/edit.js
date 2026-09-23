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
                exitCode: EXIT_SUCCESS
            };                
        }
        const target = args[0];
        if (!target){
            return {
                stdout: "",
                stderr: "edit: missing operand",
                exitCode: EXIT_FAILURE
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
                    exitCode: EXIT_FAILURE
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
                    exitCode: EXIT_FAILURE
                };
            }
            // Structural (opens the real file node for in-place editing) -
            // blocked for anything else under a protected system path,
            // e.g. /bin/ls.
            if (terminal.fs.isProtected(target, terminal.cwd)) {
                return {
                    stdout: "",
                    stderr: `edit: ${target}: Permission denied`,
                    exitCode: EXIT_FAILURE
                };
            }
            if (terminal.fs.isDirectory(node)) {
                return {
                    stdout: "",
                    stderr: `edit: ${target}: is a directory`,
                    exitCode: EXIT_FAILURE
                };
            }
        }

        // Only actually open the full-screen editor overlay when a real
        // person is there to see and use it - NOT when this command's own
        // output is itself being consumed by something else (a pipe, a
        // redirect, or $(...) capturing it - see the comment on
        // _pipeOutputConsumed in execute.js). openEditor() synchronously
        // hides the normal terminal input/output and shows the editor
        // overlay - it doesn't hang anything on its own, but if the
        // command that triggered it is running in the background (e.g.
        // `x=$(edit file.txt)`, or a line inside an `sh` script), the rest
        // of that line/script would keep right on running UNDERNEATH an
        // editor screen nobody meant to open, with no way to tell the
        // editor and the shell's execution apart until the person
        // eventually notices and presses Escape.
        if (terminal._pipeOutputConsumed) {
            return {
                stdout: "",
                stderr: "edit: no interactive terminal available",
                exitCode: EXIT_FAILURE
            };
        }
        terminal.openEditor(node, path);

        return {
            stdout: "",
            stderr: "",
            exitCode: EXIT_SUCCESS
        };
    }
});
