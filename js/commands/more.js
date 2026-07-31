registerCommand("more", {
    description: "",
    usage: "",
    async execute(terminal, args, stdin) {
        const target = args[0];

        if (!target) {
            return {
                stdout: "",
                stderr: "more: missing file operand",
                exitCode: 1
            };        
        }
        const fullPath = resolveRelativePath(terminal.cwd, target);
        let pathresult = resolvePath(fullPath);

        const node = pathresult ? pathresult.node : null;      

        if (!node) {
            return {
                stdout: "",
                stderr: `more: no such file: ${target}`,
                exitCode: 1
            };        
        }

        if(fullPath.includes("/bin/")){
            return {
                stdout: "",
                stderr: `more: cannot display files in /bin`,
                exitCode: 1
            };
        }             

        if (node.type === "dir") {
            return {
                stdout: "",
                stderr: `more: ${target}: is a directory`,
                exitCode: 1
            };
        }

        node.accessed = Date.now();
        const lines = node.content.split(/\r?\n/);
        terminal.pager.linesPrinted = 0;
        for (const line of lines) {
            terminal.write(line,{color:"#ffffff"});
            terminal.pager.linesPrinted++;
            if (terminal.pager.linesPrinted >= terminal.pager.pageSize) {
                let keepGoing = await terminal.pageBreak();
                if (keepGoing === false) {
                    break;
                }
            }
            await terminal.sleep(20);
        }
        return {
            stdout:"",
            stderr:"",
            exitCode:0
        };    
    }
});