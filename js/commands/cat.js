registerCommand("cat", {
    name: "Display the contents of one or more files.",
    synopsis : "cat [OPTIONS] FILE...",
    description: "Read each specified file and write its contents to standard output in the order provided. Multiple files are concatenated together.",
    options: [
        "-n    Add line numbers to the output."
    ],
    examples: [
        "cat notes.txt",
        "cat -n logs.txt",
        "cat part1.txt part2.txt"
    ],
    execute(terminal, args, stdin) {    
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        const parsed = terminal.parseFlags(args,{n: false});
        const numberLines = parsed.flags.has("n");
        const target = parsed.args[0];
        let content = "";

        if (!target) {
            if (!stdin) {
                return {
                    stdout: "",
                    stderr: "cat: missing file operand",
                    exitCode: 1
                };
            }

            content = stdin;
        } else {
            const node = terminal.fs.get(target, terminal.cwd);
            if (!node) {
                return {
                    stdout: "",
                    stderr: `cat: no such file: ${target}`,
                    exitCode: 1
                };         
            }

            if(terminal.fs.isInBin(target, terminal.cwd)){
                return {
                    stdout: "",
                    stderr: `cat: cannot display files in /bin`,
                    exitCode: 1
                };
            }             

            if (node.type === "dir") {
                return {
                    stdout: "",
                    stderr: `cat: ${target}: is a directory`,
                    exitCode: 1
                };         
            }
            node.accessed = Date.now();
            content = node.content;
        }

        if (numberLines){        
            let lineNumber = 1;
            let returnContent = "";
            let contents = content.split(/\r?\n/);
            for (const line of contents) {
                returnContent += `  ${lineNumber}  ${line} \n`;
                lineNumber++;
            }
            content = returnContent.replace(/\r?\n$/, "");
        }

        return {
            stdout: content,
            stderr: "",
            exitCode: 0
        };    
    }
});