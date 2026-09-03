/**
 * `cat` command.
 * Prints a file's full contents (or piped stdin, if no file given) to
 * stdout, optionally prefixing each line with a line number (-n).
 */
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
    async execute(terminal, args, stdin) {    
        // Print usage info and exit early when --help is passed
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: EXIT_SUCCESS
            };                
        }
        const parsed = terminal.parseFlags(args,{n: false});
        const numberLines = parsed.flags.has("n");
        const targets = parsed.args;
        let content = "";

        if (targets.length === 0) {
            // No file given - fall back to piped stdin
            if (!stdin) {
                return {
                    stdout: "",
                    stderr: "cat: missing file operand",
                    exitCode: EXIT_FAILURE
                };
            }

            content = stdin;
        } else {
            // Real `cat` concatenates every file it's given, in order,
            // and keeps going (printing an error for each bad one) rather
            // than stopping at the first failure - important for
            // `cat *.txt`, where one bad match shouldn't hide the rest.
            const parts = [];
            const errors = [];

            for (const target of targets) {
                const node = terminal.fs.get(target, terminal.cwd);
                if (!node) {
                    errors.push(`cat: no such file: ${target}`);
                    continue;
                }

                // Blocked for protected system files (/bin, /dev) - EXCEPT
                // devices, which are meant to be read through (cat /dev/random
                // etc. is a real feature, not a security hole).
                if (terminal.fs.isProtected(target, terminal.cwd) && !terminal.fs.isDevice(node)) {
                    errors.push(`cat: ${target}: Permission denied`);
                    continue;
                }

                if (terminal.fs.isDirectory(node)) {
                    errors.push(`cat: ${target}: is a directory`);
                    continue;
                }
                node.accessed = Date.now();
                parts.push(terminal.fs.readContent(node));
            }

            if (parts.length === 0) {
                return {
                    stdout: "",
                    stderr: errors.join("\n"),
                    exitCode: EXIT_FAILURE
                };
            }

            content = parts.join("\n");

            if (errors.length > 0) {
                return {
                    stdout: numberLines ? numberContent(content) : content,
                    stderr: errors.join("\n"),
                    exitCode: EXIT_FAILURE
                };
            }
        }

        if (numberLines){        
            content = numberContent(content);
        }

        return {
            stdout: content,
            stderr: "",
            exitCode: EXIT_SUCCESS
        };    

        // Prefixes each line of `text` with its (1-based) line number -
        // numbered continuously across every concatenated file, matching
        // real `cat -n` rather than restarting the count per file.
        function numberContent(text) {
            let lineNumber = 1;
            let returnContent = "";
            for (const line of text.split(/\r?\n/)) {
                returnContent += `  ${lineNumber}  ${line} \n`;
                lineNumber++;
            }
            return returnContent.replace(/\r?\n$/, "");
        }
    }
});
