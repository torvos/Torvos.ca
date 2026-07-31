registerCommand("ls", {
    description: "List directory contents",
    usage: "ls [OPTION]... [FILE]...",
    execute(terminal, args, stdin) {
        const parsed = terminal.parseFlags(args,{l: false,a: false,R: false});
        const longFormat = parsed.flags.has("l");
        const showHidden = parsed.flags.has("a");
        const recursive = parsed.flags.has("R");

        if (parsed.args.length === 0) {
            if (terminal.lastExpansionEmpty) {
                terminal.lastExpansionEmpty = false;
                return {
                    stdout:"",
                    stderr:"",
                    exitCode:0
                };
            }
            parsed.args.push(terminal.cwd);
        }

        const targets = parsed.args.length > 0
            ? parsed.args
            : [terminal.cwd];

        let output = [];
        let errors = [];

        function listDirectory(dirNode, dirPath) {
            dirNode.accessed = Date.now();
            const children = dirNode.children || {};
            const keys = Object.keys(children);
            let entries = [];
            let directories = [];
            keys.forEach(name => {
                const child = children[name];
                if (child.hidden && !showHidden) {
                    return;
                }
                if (longFormat) {
                    entries.push(formatLongEntry(name, child));
                }
                else {
                    entries.push(
                        child.type === "dir"
                            ? `${name}/`
                            : name
                    );
                }
                if (child.type === "dir") {
                    directories.push({
                        name,
                        node: child
                    });
                }
            });

            if (recursive) {
                directories.forEach(dir => {
                    entries.push("");
                    entries.push(
                        `${dirPath}${dir.name}:`
                    );
                    entries.push(
                        listDirectory(
                            dir.node,
                            `${dirPath}${dir.name}/`
                        )
                    );
                });
            }

            return entries.join(
                recursive || longFormat
                    ? "\n"
                    : "  "
            );
        }

        for (const target of targets) {
            const path = resolveRelativePath(
                terminal.cwd,
                target
            );

            const pathresult = resolvePath(path);
            const node = pathresult
                ? pathresult.node
                : null;

            if (!node) {
                errors.push(
                    `ls: cannot access '${target}': No such file or directory`
                );
                continue;
            }

            if (node.type === "file" || node.type === "symlink") {
                if (longFormat) {
                    output.push(
                        formatLongEntry(
                            target.split(ROOT).pop(),
                            node
                        )
                    );
                }
                else {
                    output.push(
                        target.split(ROOT).pop()
                    );
                }
                continue;
            }

            if (targets.length > 1) {

                output.push(
                    `${target}:`
                );
            }

            output.push(
                listDirectory(
                    node,
                    target === ROOT ? "" : `${target}/`
                )
            );
        }

        return {
            stdout: output.join("\n"),
            stderr: errors.join("\n"),
            exitCode: errors.length ? 1 : 0
        };
    }
});
