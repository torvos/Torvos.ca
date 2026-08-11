/**
 * `rm` command.
 * Removes a file, symlink, or (with -r) a directory and everything under
 * it. Refuses to remove directories without -r, and refuses to remove
 * "/" entirely regardless of flags. With -f, a missing target is treated
 * as success rather than an error (matches real `rm -f` semantics).
 */
registerCommand("rm", {
    name: "Remove files/directories.",
    synopsis : "rm [OPTIONS] FILE_OR_DIRECTORY",
    description: "is used to permanently delete files and directories from the filesystem.",
    options: [
        "-f    force the deletion of the files or directory.",
        "-r    apply permissions recursively to contents of a folder."
    ],
    examples: [
        "rm -rf /",
        "rm resume.md"
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
        const parsed = terminal.parseFlags(args,{f: false,r: false});
        const force = parsed.flags.has("f");
        const recursive = parsed.flags.has("r");
        const target = parsed.args[0];

        if (target === undefined) {
            return {
                stdout: "",
                stderr: `rm: missing operand`,
                exitCode: 1
            };    
        }
        
        if(target === ROOT){
                // Hard-coded guard: never allow deleting the filesystem root
                return {
                    stdout: "",
                    stderr: "rm: prohibited to use on '/'",
                    exitCode: 1
                };          
        }

        const result = terminal.fs.getParent(target, terminal.cwd);
        
        if (!result || !result.parent.children[result.name]) {
            if (force) {
                // -f: missing target is silently treated as success
                return {
                    stdout: "",
                    stderr: "",
                    exitCode: 0
                };
            }
            return {
                stdout: "",
                stderr: `rm: cannot remove '${target}': No such file or directory`,
                exitCode: 1
            };   
        }
        
        const node = result.parent.children[result.name];

        if (terminal.fs.isSymlink(node)) {
            // Symlinks themselves are removed directly (their target is untouched)
            result.parent.modified = Date.now();
            delete result.parent.children[result.name];
            return {
                stdout: "",
                stderr: "",
                exitCode: 0
            };   
        }

        if (terminal.fs.isDirectory(node)) {
            if (!recursive) {
                return {
                    stdout: "",
                    stderr: `rm: cannot remove '${target}': Is a directory`,
                    exitCode: 1
                };
            }

            // Recursively deletes every descendant entry of `dir` before
            // the directory itself gets removed below
            function removeChildren(dir) {
                if (!dir.children) {
                    return;
                }

                for (const key of Object.keys(dir.children)) {
                    const child = dir.children[key];

                    if (terminal.fs.isDirectory(child)) {
                        removeChildren(child);
                    }

                    delete dir.children[key];
                }
            }
            removeChildren(node);

            result.parent.modified = Date.now();
            delete result.parent.children[result.name];

            return {
                stdout: "",
                stderr: "",
                exitCode: 0
            };
        }

        // Plain file
        result.parent.modified = Date.now();
        delete result.parent.children[result.name];    

        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };    
    }
});
