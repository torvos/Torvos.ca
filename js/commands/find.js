/**
 * `find` command.
 * Recursively walks a starting directory, printing the path of every
 * descendant that matches the given filters: -name (glob pattern
 * converted to regex), -type (f for file, d for directory), and
 * -maxdepth (recursion limit).
 */
registerCommand("find", {
    name: "Search for files and directories.",
    synopsis : "find [PATH] [OPTIONS]",
    description: "Recursively search a directory tree for files or directories matching specified criteria.",
    options: [
        "-name PATTERN      Match file names.",
        "-type TYPE         Match object type.",
        "-maxdepth N        Limit recursion depth."
    ],
    examples: [
        "find . -name '*.txt'",
        "find / -type d",
        "find . -maxdepth 2"
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
        const parsed = terminal.parseFlags(args, {name: true, type: true, maxdepth: true});
        const namePattern = parsed.options?.name ?? null;
        const typeFilter = parsed.options?.type ?? null;
        const maxDepth = parsed.options?.maxdepth !== undefined ? parseInt(parsed.options.maxdepth, 10) : Infinity;
        // Convert a simple glob pattern (* and ?) into an anchored regex
        const regex = namePattern ? new RegExp("^" + namePattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".") + "$"): null;

        const target = parsed.args[0] || terminal.cwd;
        const path = terminal.fs.getFullPath(target, terminal.cwd);
        const root = terminal.fs.get(target, terminal.cwd);

        if (!root) {
            return {
                stdout: "",
                stderr: `find: '${target}': No such starting directory`,
                exitCode: 1
            };
        }

        // Recursively walks `node`, appending a line for every child that
        // passes the type/name filters, then descending into subdirectories
        // (as long as maxDepth allows).
        function walk(node, path = terminal.cwd, depth = 1) {
            if(path === "/"){
                path = "";
            }
            let output = "";
            if (depth > maxDepth || !node.children) {
                return output;
            }
            let keys = Object.keys(node.children);
            keys.forEach((key, index) => {
                const child = node.children[key];
                if (typeFilter === "f"){
                    if(terminal.fs.isFile(child)){
                        if(namePattern){
                            if(regex.test(key)){
                                output += `${path}/${key}\n`;
                            }
                        }
                        else{
                            output += `${path}/${key}\n`;
                        }
                    }
                }                
                else if (typeFilter === "d"){
                    if(terminal.fs.isDirectory(child)){
                        if(namePattern){
                            if(regex.test(key)){
                                output += `${path}/${key}\n`;
                            }                        
                        }
                        else{
                            output += `${path}/${key}\n`;
                        }
                    }
                }
                else{
                    // No type filter - match on name pattern alone (or list everything)
                    if(namePattern){
                        if(regex.test(key)){
                            output += `${path}/${key}\n`;
                        }                    
                    }
                    else{
                        output += `${path}/${key}\n`;
                    }
                }
                if (terminal.fs.isDirectory(child) && depth < maxDepth) {
                    const nextPath = path + "/" + key;
                    output += walk(child, nextPath, depth + 1);
                }
            });
            return output;
        }

        return {
            stdout: walk(root, path).replace(/\r?\n$/, ""),
            stderr: "",
            exitCode: 0
        };
    }
});
