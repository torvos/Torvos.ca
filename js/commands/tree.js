registerCommand("tree", {
    name: "Display the directory hierarchy.",
    synopsis : "tree [OPTIONS] [DIRECTORY]",
    description: "is a command-line utility used to display the contents of a directory in a deeply indented, hierarchical structure.",
    options: [
        "-d    Lists directories only and hides individual files",
        "-a    Includes hidden files and directories.",
        "-L #  Limits the recursion to a maximum depth of X levels"
    ],
    examples: [
        "tree",
        "tree -d /",
        "tree -a ~"
    ],
    async execute(terminal, args, stdin) {    
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        const parsed = terminal.parseFlags(args,{d: false,a: false,L: true});
        const onlyDirectory = parsed.flags.has("d");
        const showHidden = parsed.flags.has("a");
        const maxDepth = parsed.options?.L !== undefined
            ? parseInt(parsed.options.L, 10)
            : Infinity;

        const target = parsed.args[0] || terminal.cwd;
        const path = resolveRelativePath(terminal.cwd, target);
        let pathresult = resolvePath(path);
        const root = pathresult ? pathresult.node : null;

        function walk(node, prefix = "", depth = 1) {
            let output = "";
            if (!node.children) return output;

            let keys = Object.keys(node.children);

            if (!showHidden) {
                keys = keys.filter(key => !node.children[key].hidden);
            }        
            if (onlyDirectory){
                keys = keys.filter(key => node.children[key].type === "dir");
            }
            
            keys.forEach((key, index) => {
                const child = node.children[key];
                const isLast = index === keys.length - 1;
                const connector = isLast ? "└── " : "├── ";
                output += `${prefix}${connector}${key}${child.type === "dir" ? ROOT : ""}\n`;

                if (child.type === "dir" && depth < maxDepth) {
                    const nextPrefix = prefix + (isLast ? "    " : "│   ");
                    output += walk(child, nextPrefix, depth + 1);
                }
            });
            return output;
        }

        if (!root) {
            return {
                stdout:"",
                stderr:`tree: ${target}: no such file or directory`,
                exitCode:1
            };
        }

        return {
            stdout: walk(root).replace(/\r?\n$/, ""),
            stderr: "",
            exitCode: 0
        };
    }
});