registerCommand("cat", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {    
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
            const fullPath = resolveRelativePath(terminal.cwd, target);

            let pathresult = resolvePath(fullPath);

            const node = pathresult ? pathresult.node : null;

            if (!node) {
                return {
                    stdout: "",
                    stderr: `cat: no such file: ${target}`,
                    exitCode: 1
                };         
            }

            if(fullPath.includes("/bin/")){
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