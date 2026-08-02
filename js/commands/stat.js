registerCommand("stat", {
    name: "Display detailed file metadata.",
    synopsis : "stat [OPTIONS] [FILE_OR_DIRECTORY]",
    description: "is a built-in command-line utility used to display detailed metadata about files, directories, or filesystems.",
    options: [
        "-R    apply recursively to contents of a directory."
    ],
    examples: [
        "stat resume.md",
        "stat -R ~"
    ],
    async execute(terminal, args, stdin) {
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        const parsed = terminal.parseFlags(args, { R: false });
        const recursive = parsed.flags.has("R");
        args = parsed.args;

        let funcStdout = "";
        let funcStderr = "";
        let funcExitCode = 0;

        let text = "";

        if (args.length === 0) {
            funcStderr = "stat: missing operand";
            funcExitCode = 1;            
        }
        else{
            for (const target of args) {

                const node = terminal.fs.get(target, terminal.cwd);

                if (!node) {
                    funcStderr += `stat: no such file: ${target}\n`;
                    funcExitCode = 1;
                    continue;
                }
                if(terminal.fs.isInBin(target, terminal.cwd)){
                    return {
                        stdout: "",
                        stderr: `stat: cannot display files in /bin`,
                        exitCode: 1
                    };
                }             

                function printStat(name, item) {

                    funcStdout += `    File: ${name}\n`;
                    funcStdout += `    Type: ${item.type}\n`;
                    funcStdout += `    Size: ${terminal.fs.getDirectorySize(item)}\n`;
                    funcStdout += `    Mode: ${item.mode}\n`;
                    funcStdout += `   Owner: ${item.owner}\n`;
                    funcStdout += `   Group: ${item.group}\n`;
                    funcStdout += ` Created: ${terminal.fs.formatDate(item.created)}\n`;
                    funcStdout += `Modified: ${terminal.fs.formatDate(item.modified)}\n`;
                    funcStdout += `Accessed: ${terminal.fs.formatDate(item.accessed)}\n\n`;
                }


                function walkStat(item, path) {

                    printStat(path, item);

                    if (recursive && item.type === "dir" && item.children) {

                        for (const [childName, childNode] of Object.entries(item.children)) {

                            walkStat(
                                childNode,
                                `${path}/${childName}`
                            );
                        }
                    }
                }


                walkStat(node, target);
            }
        }
        return {
            stdout: funcStdout.replace(/\r?\n$/, ""),
            stderr: funcStderr.replace(/\r?\n$/, ""),
            exitCode: funcExitCode
        };
    }
});
