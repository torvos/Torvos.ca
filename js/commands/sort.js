registerCommand("sort", {
    name: "Sort lines of text",
    synopsis : "sort [OPTIONS] [FILE...]",
    description: " is a powerful utility used to arrange lines of text in files or from standard input. By default, it outputs lines in alphabetical (ASCII) ascending order without modifying the original source file.",
    options: [
        "-r    Reverses the sorting order to descending.",
        "-n    Sorts values numerically rather than alphabetically.",
        "-f    Folds lowercase characters into uppercase to ignore case sensitivity.",
        "-u    Suppresses duplicate lines, returning only unique records"
    ],
    examples: [
        "sort names.txt",
        "sort -n numbers.txt",
        "sort -u raw_logs.txt"
    ],
   async execute(terminal, args, stdin) {    
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        const parsed = terminal.parseFlags(args, {r: false, n: false, f: false, u: false});
        const reverse = parsed.flags.has("r");
        const numeric = parsed.flags.has("n");
        const ignoreCase = parsed.flags.has("f");
        const unique = parsed.flags.has("u");
        let text = "";

        if (stdin !== undefined && stdin !== null && stdin !== "") {
            text = stdin;
        } else {
            if (parsed.args.length === 0) {
                return {
                    stdout: "",
                    stderr: "sort: missing operand",
                    exitCode: 1                
                };
            }
            const contents = [];

            for (const file of parsed.args) {
                const node = terminal.fs.get(file, terminal.cwd);
                if (!node) {
                    return {
                        stdout: "",                    
                        stderr: `sort: ${file}: No such file or directory`,
                        exitCode: 1  
                    };
                }

                if(terminal.fs.isInBin(file, terminal.cwd)){
                    return {
                        stdout: "",
                        stderr: `sort: cannot display files in /bin`,
                        exitCode: 1
                    };
                }             

                if (terminal.fs.isDirectory(node)) {
                    return {
                        stdout: "",                    
                        stderr: `sort: ${file}: Is a directory`,
                        exitCode: 1  
                    };
                }
                contents.push(node.content);
            }
            text = contents.join("\n");
        }
        let lines = text.split(/\r?\n/);
        if (lines.length && lines[lines.length - 1] === "") {
            lines.pop();
        }
        lines.sort((a,b)=>{
            let left = a;
            let right = b;
            if (ignoreCase) {
                left = left.toLowerCase();
                right = right.toLowerCase();
            }
            if (numeric) {
                const na = Number(left);
                const nb = Number(right);
                if (!Number.isNaN(na) && !Number.isNaN(nb)) {
                    return na - nb;
                }
            }
            return left.localeCompare(right);
        });

        if (unique) {
            lines = lines.filter((line, index) => {
                if (index === 0) {
                    return true;
                }

                if (ignoreCase) {
                    return line.toLowerCase() !== lines[index - 1].toLowerCase();
                }

                return line !== lines[index - 1];
            });
        }
        if (reverse) {
            lines.reverse();
        }


        return {
            stdout: lines.join("\n"),
            stderr: "",
            exitCode: 0
        };    
    }
});