registerCommand("stat", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        const parsed = terminal.parseFlags(args, { R: false });
        const recursive = parsed.flags.has("R");
        args = parsed.args;

        let funcStdout = "";
        let funcStderr = "";
        let funcExitCode = 0;

        let text = "";

        if (args.length === 0) {
            funcStderr = "stat: missing operand";
            funcExitCode = 1;            
        }
        else{
            for (const target of args) {

                const fullPath = resolveRelativePath(terminal.cwd, target);
                const pathresult = resolvePath(fullPath);
                const node = pathresult ? pathresult.node : null;

                if (!node) {
                    funcStderr += `stat: no such file: ${target}\n`;
                    funcExitCode = 1;
                    continue;
                }
                if(fullPath.includes("/bin/")){
                    return {
                        stdout: "",
                        stderr: `stat: cannot display files in /bin`,
                        exitCode: 1
                    };
                }             

                function printStat(name, item) {

                    funcStdout += `    File: ${name}\n`;
                    funcStdout += `    Type: ${item.type}\n`;
                    funcStdout += `    Size: ${window.getDirectorySize(item)}\n`;
                    funcStdout += `    Mode: ${item.mode}\n`;
                    funcStdout += `   Owner: ${item.owner}\n`;
                    funcStdout += `   Group: ${item.group}\n`;
                    funcStdout += ` Created: ${window.formatDate(item.created)}\n`;
                    funcStdout += `Modified: ${window.formatDate(item.modified)}\n`;
                    funcStdout += `Accessed: ${window.formatDate(item.accessed)}\n\n`;
                }


                function walkStat(item, path) {

                    printStat(path, item);

                    if (recursive && item.type === "dir" && item.children) {

                        for (const [childName, childNode] of Object.entries(item.children)) {

                            walkStat(
                                childNode,
                                `${path}/${childName}`
                            );
                        }
                    }
                }


                walkStat(node, target);
            }
        }
        return {
            stdout: funcStdout.replace(/\r?\n$/, ""),
            stderr: funcStderr.replace(/\r?\n$/, ""),
            exitCode: funcExitCode
        };
    }
});
