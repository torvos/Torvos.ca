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
        if (node && node.type === "dir"){
            if (Object.keys(node.children).length > 0) {
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
        else if (node.type === "file"){
            return {
                stdout: "",
                stderr: `rmdir: ${target} is a file please use rm`,
                exitCode: 1
            };           

        }
    }
});