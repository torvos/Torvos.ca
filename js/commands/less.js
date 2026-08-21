/**
 * `less` command.
 * Prints a file's content line-by-line directly to the terminal (instead
 * of returning it via stdout), pausing with the "--More--" pager
 * (terminal.pageBreak) whenever a full screen's worth of lines has been
 * shown. Functionally identical to `more` in this terminal - only
 * forward paging is supported (no backward scrolling or search).
 */
registerCommand("less", {
    name: "View a file one page at a time.",
    synopsis : "less FILE...",
    description: "is a terminal pager used to view the contents of a text file one screen or page at a time, preventing long files or heavy command outputs from flooding your terminal window. In this shell it behaves the same as `more` (forward paging only).",
    options: [],
    examples: [
        "less resume.md"
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
                stderr: "less: missing file operand",
                exitCode: 1
            };        
        }
        const node = terminal.fs.get(target, terminal.cwd);

        if (!node) {
            return {
                stdout: "",
                stderr: `less: no such file: ${target}`,
                exitCode: 1
            };        
        }

        if (terminal.fs.isProtected(target, terminal.cwd) && !terminal.fs.isDevice(node)) {
            return {
                stdout: "",
                stderr: `less: ${target}: Permission denied`,
                exitCode: 1
            };
        }

        if (terminal.fs.isDirectory(node)) {
            return {
                stdout: "",
                stderr: `less: ${target}: is a directory`,
                exitCode: 1
            };
        }

        node.accessed = Date.now();
        const lines = terminal.fs.readContent(node).split(/\r?\n/);

        // If the whole file fits within one page (or paging isn't
        // configured/available - e.g. pageSize is still 0), there's
        // nothing to actually paginate. Return the content the normal
        // way instead of writing it directly, so short files compose
        // naturally with capture ($()), pipes, and redirects, the same
        // as any other command. Real pagination (writing progressively
        // with pause-on-full-page) only kicks in when it's genuinely
        // needed, for files longer than one screen.
        if (terminal.pager.pageSize <= 0 || lines.length <= terminal.pager.pageSize) {
            return {
                stdout: lines.join("\n"),
                stderr: "",
                exitCode: 0
            };
        }

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
