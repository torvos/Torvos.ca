/**
 * `rmdir` command.
 * Removes a directory, but only if it's completely empty - refuses (with
 * an error) if it still has children, is a file, or doesn't exist.
 */
registerCommand("rmdir", {
    name: "Remove empty directories.",
    synopsis : "rmdir DIRECTORY_NAME ",
    description: "is used exclusively to remove empty directories from the filesystem. It acts as a safety mechanism, failing completely if the folder contains any files or subdirectories to prevent accidental data loss.",
    options: [],
    examples: [
        "rmdir test",
        "rmdir Documents"
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
                stderr: `rmdir: missing operand`,
                exitCode: 1
            };          
        }
        const node = terminal.fs.get(target, terminal.cwd);
        if (!node){
            return {
                stdout: "",
                stderr: `rmdir: directory ${target} not found`,
                exitCode: 1
            };          
        }
        if (node && terminal.fs.isDirectory(node)){
            if (Object.keys(node.children).length > 0) {
                // Not empty - refuse to remove (rmdir's core safety behavior)
                return {
                    stdout: "",
                    stderr: `rmdir: failed to remove ${target}: Directory not empty`,
                    exitCode: 1
                };           
            }
            else{
                const result = terminal.fs.getParent(target, terminal.cwd);

                if (!result) {
                    return {
                        stdout: "",
                        stderr: `rmdir: directory ${target} not found`,
                        exitCode: 1
                    };           
                }

                result.parent.modified = Date.now();
                delete result.parent.children[result.name];       
                return {
                    stdout: "",
                    stderr: "",
                    exitCode: 0
                };            
            }
        }
        else if (terminal.fs.isFile(node)){
            // Point the user toward `rm` for files
            return {
                stdout: "",
                stderr: `rmdir: ${target} is a file please use rm`,
                exitCode: 1
            };           

        }
        else {
            return {
                stdout: "",
                stderr: `rmdir: failed to remove '${target}': Not a directory`,
                exitCode: 1
            };
        }
    }
});
