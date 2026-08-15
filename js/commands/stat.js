/**
 * `stat` command.
 * Prints detailed metadata (type, size, mode, owner/group, timestamps)
 * for one or more files/directories. With -R, recurses into subdirectories
 * and prints an entry for every descendant too.
 */
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
        // Print usage info and exit early when --help is passed
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
        let funcStdoutSegments = [];
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

                // Appends a formatted metadata block for a single item to funcStdout
                function printStat(name, item) {
                    const rows = [
                        ["    File", name],
                        ["    Type", item.type],
                        ["    Size", terminal.fs.getDirectorySize(item)],
                        ["    Mode", item.mode],
                        ["   Owner", item.owner],
                        ["   Group", item.group],
                        [" Created", terminal.fs.formatDate(item.created)],
                        ["Modified", terminal.fs.formatDate(item.modified)],
                        ["Accessed", terminal.fs.formatDate(item.accessed)]
                    ];
                    for (const [label, value] of rows) {
                        funcStdout += `${label}: ${value}\n`;
                        funcStdoutSegments.push([
                            { text: `${label}: `, color: COLOR_LABEL },
                            { text: `${value}`, color: COLOR_STDOUT }
                        ]);
                    }
                    funcStdout += "\n";
                    funcStdoutSegments.push(undefined);
                }


                // Prints stat info for `item`, and (when recursive) walks
                // into every descendant, building up its full path as it goes.
                function walkStat(item, path) {

                    printStat(path, item);

                    if (recursive && terminal.fs.isDirectory(item) && item.children) {

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
            stdoutSegments: funcStdoutSegments,
            stderr: funcStderr.replace(/\r?\n$/, ""),
            exitCode: funcExitCode
        };
    }
});
