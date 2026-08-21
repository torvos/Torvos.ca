/**
 * `ln` command.
 * Creates a symbolic link (only -s is supported; plain hard links are
 * rejected) pointing from `link` to `target`'s resolved absolute path.
 */
registerCommand("ln", {
    name: "Create hard or symbolic links.",
    synopsis : "ln [OPTIONS] TARGET LINK_NAME",
    description: "is a built-in utility used to create links between files and directories, acting like shortcuts or aliases to prevent data duplication. By default, the ln command creates hard links, but it is most frequently used with the -s flag to create symbolic links (soft links)",
    options: [
        "-s.   create a symbolic link"
    ],
    examples: [
        "ln -s /bin/ls /home/guest/ls",
        "ln -s /home/guest/resume.md /home/guest/bio.md"
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
        const parsed = terminal.parseFlags(args,{s: false});
        const SymbolicLink = parsed.flags.has("s");
        const target = parsed.args[0];
        const link = parsed.args[1];

        if(!SymbolicLink){
            // This simulated filesystem only supports symbolic links
            return {
                stdout: "",
                stderr: "ln: Hard links are not supported use -s",
                exitCode: 1
            };         
        }
        else{
            if(target && link){
                
                const targetPath = terminal.fs.getFullPath(target, terminal.cwd);        
                const targetNode = terminal.fs.get(target, terminal.cwd);

                const linkPath = terminal.fs.getFullPath(link, terminal.cwd);
                const linkNode = terminal.fs.get(link, terminal.cwd);

                if (terminal.fs.isProtected(link, terminal.cwd)) {
                    return {
                        stdout: "",
                        stderr: `ln: ${link}: Permission denied`,
                        exitCode: 1
                    };
                }
                if (terminal.fs.isProtected(target, terminal.cwd)) {
                    return {
                        stdout: "",
                        stderr: `ln: ${target}: Permission denied`,
                        exitCode: 1
                    };
                }

                if (!targetNode) {
                    return {
                        stdout:"",
                        stderr:`ln: ${target}: No such file or directory`,
                        exitCode:1
                    };
                }

                const result = terminal.fs.getParent(linkPath, terminal.cwd);

                if (!result) {
                    return {
                        stdout: "",
                        stderr: `ln: invalid path ${link}`,
                        exitCode: 1
                    };           
                }

                result.parent.modified = Date.now();
                // Store the link pointing at the target's resolved absolute path
                result.parent.children[result.name] = terminal.fs.createLink(targetPath);
            }
            else{
                return {
                    stdout: "",
                    stderr: "ln: missing operand",
                    exitCode: 1
                };               
            }
        }
        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };    
    }
});
