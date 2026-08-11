/**
 * `sed` command.
 * A minimal stream-editor implementation supporting two script forms:
 *   - "s/pattern/replacement/[g]" - substitute (optionally with a leading
 *     line-number address, e.g. "4s/apple/orange/", and an optional
 *     alternate delimiter character in place of "/")
 *   - "p" - print matching lines (optionally address-restricted)
 * With -i, writes the result back into the source file instead of
 * printing it; with -n, suppresses the normal auto-print of the result.
 */
registerCommand("sed", {
    name: "Perform stream editing on text.",
    synopsis : "sed [OPTIONS] 'command' file_name",
    description: "is a powerful command-line tool used to parse, filter, and transform text line-by-line. It is most commonly used for finding and replacing text without opening the file.",
    options: [
        "-i    Modifies the original file directly.",
        "-n    Suppresses automatic printing of the pattern space."
    ],
    examples: [
        "sed 's/apple/orange/' fruits.txt",
        "sed 's/apple/orange/g' fruits.txt",
        "sed '4s/apple/orange/' fruits.txt"
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
        const parsed = terminal.parseFlags(args, {i: false, n: false});
        const inPlace = parsed.flags.has("i");
        const silent = parsed.flags.has("n");

        if (parsed.args.length === 0) {
            return {
                stdout: "",
                stderr: "sed: missing script",
                exitCode: 1
            };
        }

        const script = parsed.args[0];
        const target = parsed.args[1];
        let content = "";
        let node = null;

        if (target) {

            node = terminal.fs.get(target, terminal.cwd);
            if (!node) {
                return {
                    stdout: "",
                    stderr: `sed: ${target}: no such file`,
                    exitCode: 1
                };
            }

            if(terminal.fs.isInBin(target, terminal.cwd)){
                return {
                    stdout: "",
                    stderr: `sed: cannot display files in /bin`,
                    exitCode: 1
                };
            }             
            

            if (terminal.fs.isDirectory(node)) {
                return {
                    stdout: "",
                    stderr: `sed: ${target}: is a directory`,
                    exitCode: 1
                };
            }

            node.accessed = Date.now();
            content = node.content;

        } else {
            // No file given - operate on piped stdin instead
            if (stdin == null) {
                return {
                    stdout: "",
                    stderr: "sed: no input",
                    exitCode: 1
                };
            }
            content = stdin;
        }

        let lines = content.split(/\r?\n/);

        let address = null;
        let command = script;

        // Optional leading line-number address, e.g. "4s/.../.../ " -> address 4
        const addressMatch = command.match(/^(\d+)(.*)$/);

        if (addressMatch) {
            address = parseInt(addressMatch[1], 10);
            command = addressMatch[2];
        }

        // Parses "s<delim>pattern<delim>replacement<delim>flags" using
        // whatever character immediately follows "s" as the delimiter
        // (so both "s/a/b/" and "s#a#b#" work)
        const substitute = command.match(/^s(.)(.*?)\1(.*?)(?:\1([g]*))?$/);
                                        
        if (substitute) {

            const delimiter = substitute[1];
            const pattern = substitute[2];
            const replacement = substitute[3];
            const flags = substitute[4];

            let regex;

            try {
                regex = new RegExp(pattern, flags?.includes("g") ? "g" : "");
            } catch {
                return {
                    stdout: "",
                    stderr: "sed: invalid regular expression",
                    exitCode: 1
                };
            }

            // Apply the substitution to every line, unless a line-number
            // address restricts it to just one specific line
            lines = lines.map((line, index) => {
                if (address !== null && address !== index + 1) {
                    return line;
                }
                return line.replace(regex, replacement);
            });

        }

        else if (command === "p") {
            // "p" command: just print the matching line(s), ignoring -i/-n
            const output = [];
            lines.forEach((line, index) => {
                if (address === null || address === index + 1) {
                    output.push(line);
                }
            });
            return {
                stdout: output.join("\n"),
                stderr: "",
                exitCode: 0
            };
        }
        else {
            // Anything else is a script form this minimal sed doesn't support
            return {
                stdout: "",
                stderr: `sed: unsupported script '${script}'`,
                exitCode: 1
            };

        }
        const output = lines.join("\n");

        if (inPlace && node) {
            // -i: write the transformed content back into the file instead of printing it
            node.content = output;
            node.modified = Date.now();
            return {
                stdout: "",
                stderr: "",
                exitCode: 0
            };
        }

        return {
            stdout: silent ? "" : output,
            stderr: "",
            exitCode: 0
        };
    }
});
