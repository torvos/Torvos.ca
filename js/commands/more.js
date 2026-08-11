/**
 * `more` command.
 * Prints a file's content line-by-line directly to the terminal (instead
 * of returning it via stdout), pausing with the "--More--" pager
 * (terminal.pageBreak) whenever a full screen's worth of lines has been shown.
 */
registerCommand("more", {
    name: "View a file one page at a time.",
    synopsis : "more FILE...",
    description: "is a terminal utility used to view the contents of a text file one screen or page at a time. It prevents long files or heavy command outputs from flooding your terminal window.",
    options: [],
    examples: [
        "more resume.md"
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
        const target = args[0];
        if (!target) {
            return {
                stdout: "",
                stderr: "more: missing file operand",
                exitCode: 1
            };        
        }
        const node = terminal.fs.get(target, terminal.cwd);

        if (!node) {
            return {
                stdout: "",
                stderr: `more: no such file: ${target}`,
                exitCode: 1
            };        
        }

        if(terminal.fs.isInBin(target, terminal.cwd)){
            return {
                stdout: "",
                stderr: `more: cannot display files in /bin`,
                exitCode: 1
            };
        }             

        if (terminal.fs.isDirectory(node)) {
            return {
                stdout: "",
                stderr: `more: ${target}: is a directory`,
                exitCode: 1
            };
        }

        node.accessed = Date.now();
        const lines = node.content.split(/\r?\n/);
        terminal.pager.linesPrinted = 0;
        // Write lines directly, pausing at each page boundary until the
        // user presses a key (space/enter to continue, q to quit early)
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
