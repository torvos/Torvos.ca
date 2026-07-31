registerCommand("sed", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
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

            const fullPath = resolveRelativePath(terminal.cwd, target);
            const result = resolvePath(fullPath);

            node = result ? result.node : null;
            if (!node) {
                return {
                    stdout: "",
                    stderr: `sed: ${target}: no such file`,
                    exitCode: 1
                };
            }

            if(fullPath.includes("/bin/")){
                return {
                    stdout: "",
                    stderr: `sed: cannot display files in /bin`,
                    exitCode: 1
                };
            }             
            

            if (node.type === "dir") {
                return {
                    stdout: "",
                    stderr: `sed: ${target}: is a directory`,
                    exitCode: 1
                };
            }

            node.accessed = Date.now();
            content = node.content;

        } else {
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

        const addressMatch = command.match(/^(\d+)(.*)$/);

        if (addressMatch) {
            address = parseInt(addressMatch[1], 10);
            command = addressMatch[2];
        }

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

            lines = lines.map((line, index) => {
                if (address !== null && address !== index + 1) {
                    return line;
                }
                return line.replace(regex, replacement);
            });

        }

        else if (command === "p") {
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
            return {
                stdout: "",
                stderr: `sed: unsupported script '${script}'`,
                exitCode: 1
            };

        }
        const output = lines.join("\n");

        if (inPlace && node) {
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