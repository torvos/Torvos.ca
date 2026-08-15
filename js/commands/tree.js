/**
 * `tree` command.
 * Recursively renders a directory's contents as an ASCII-art tree
 * (├──/└── connectors), with optional filtering to directories-only (-d),
 * inclusion of hidden entries (-a), and a max recursion depth (-L).
 */
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
        // Print usage info and exit early when --help is passed
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
        const root = terminal.fs.get(target, terminal.cwd);

        // Parallel arrays kept flat/in sync throughout the recursion, same
        // approach as ls.js: one line of text, one matching segments entry
        // (or undefined for lines that don't need coloring).
        const lines = [];
        const lineSegments = [];

        // Recursively walks `node`, appending a line for every child that
        // passes the filters, using `prefix` to draw the connecting lines/
        // indentation for nested levels.
        function walk(node, prefix = "", depth = 1) {
            if (!node.children) return;

            let keys = Object.keys(node.children);

            if (!showHidden) {
                keys = keys.filter(key => !node.children[key].hidden);
            }        
            if (onlyDirectory){
                keys = keys.filter(key => terminal.fs.isDirectory(node.children[key]));
            }
            
            keys.forEach((key, index) => {
                const child = node.children[key];
                const isLast = index === keys.length - 1;
                // Last entry in a directory uses "└──", others use "├──"
                const connector = isLast ? "└── " : "├── ";
                const isDir = terminal.fs.isDirectory(child);
                const label = `${key}${isDir ? ROOT : ""}`;

                lines.push(`${prefix}${connector}${label}`);
                lineSegments.push([
                    { text: `${prefix}${connector}`, color: COLOR_STDOUT },
                    { text: label, color: isDir ? COLOR_DIRECTORY : COLOR_STDOUT }
                ]);

                if (isDir && depth < maxDepth) {
                    // Continuation prefix: blank space under the last entry,
                    // a vertical bar under any earlier entry
                    const nextPrefix = prefix + (isLast ? "    " : "│   ");
                    walk(child, nextPrefix, depth + 1);
                }
            });
        }

        if (!root) {
            return {
                stdout:"",
                stderr:`tree: ${target}: no such file or directory`,
                exitCode:1
            };
        }

        walk(root);

        return {
            stdout: lines.join("\n"),
            stdoutSegments: lineSegments,
            stderr: "",
            exitCode: 0
        };
    }
});
