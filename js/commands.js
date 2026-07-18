window.Commands = {};

window.resolvePath = function (path) {
    const parts = path.replace("~", "").split("/").filter(Boolean);
    let node = window.FileSystem["/"];
    for (const part of parts) {
        if (!node.children || !node.children[part]) {
            return null;
        }
        node = node.children[part];
    }
    return node;
};

window.resolveRelativePath = function (cwd, path) {

    function normalizePath(path) {
        const parts = [];
        for (const part of path.split("/")) {
            if (!part || part === ".") {continue;}
            if (part === "..") {
                if (parts.length > 0) {
                    parts.pop();
                }
                continue;
            }
            parts.push(part);
        }
        return "/" + parts.join("/");
    }

    if (!path || path === ".") {return cwd;}
    if (path === "~") {return "/home/guest";}
    if (path.startsWith("~/")) {path = "/home/guest" + path.slice(1);}
    if (path.startsWith("/")) {return normalizePath(path);}
    return normalizePath(`${cwd}/${path}`);
};

window.getParentDirectory = function (path) {
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) {return null;}
    const name = parts.pop();
    let parent = window.FileSystem["/"];
    for (const part of parts) {
        if (!parent.children || !parent.children[part]) {return null;}
        parent = parent.children[part];
        if (parent.type !== "dir") {return null;}
    }
    return {parent,name};
};

/* HELP */
Commands.help = function () {
    return `Torvos Terminal Commands
+--------------------------------------------------------------------+
|Navigation:                                                         |
|  ls <dir>        List directory contents                           |
|  cd <dir>        Change directory                                  |
|  cd ..           Return to parent directory                        |
|  pwd             Print working directory                           |
|  tree            Show directory structure                          |
+--------------------------------------------------------------------+
|Files:                                                              |
|  cat <file>                Display file contents                   |
|  head -n <number> <file>   Outputs the beginning portion of a file |
|  tail -n <number> <file>   Outputs the last portion of a file      |
|  more <file>               Display file one screen at a time       |
+--------------------------------------------------------------------+
|System:                                                             |
|  help            Show this help message                            |
|  reset           reverts terminal to original settings             |
|  clear           Clear terminal                                    |
|  whoami          Show current user                                 |
|  login           Login to a diffrent user account                  |
|  sudo            Execute commands with administrative              |
|  history         Displays history of commands                      |
|  echo <text>     Displays the text on the terminal                 |
+--------------------------------------------------------------------+`;
};

/* SUDO */
Commands.sudo = function (terminal) {
    return "guest users are not allowed to invoke sudo, this incident will be reported.";
};

/* HEAD - show first few lines of a file */
Commands.head = function (terminal, args) {
    if (args.length === 0){
        return `head: missing file operand`;
    }
    for (const arg of args) {
        const fullPath = resolveRelativePath(terminal.cwd, arg);
        const node = resolvePath(fullPath);
        if (node != null){
            if (!node) {
                return `head: no such file: ${arg}`;
            }
            if (node.type === "dir") {
                return `head: ${arg}: is a directory`;
            }
            if (node && node.type === "file") {
                return node.content;
            }
        }
    }
};

/* TAIL - show last few lines of file */
Commands.tail = function (terminal, args) {
    if (args.length === 0){        
        return `tail: missing file operand`;
    }
    for (const arg of args) {
        const fullPath = resolveRelativePath(terminal.cwd, arg);
        const node = resolvePath(fullPath);
        if (node != null){
            if (!node) {
                return `tail: no such file: ${arg}`;
            }
            if (node.type === "dir") {
                return `tail: ${arg}: is a directory`;
            }
            if (node && node.type === "file") {
                return node.content;
            }
        }
    }
};

/* MKDIR - create directory */
Commands.mkdir = function (terminal, args) {

    const parsed = terminal.parseFlags(args, { p: false });
    const parents = parsed.flags.has("p");
    const target = parsed.args[0];

    if (!target) {
        return "mkdir: missing operand";
    }

    const path = resolveRelativePath(terminal.cwd, target);

    function mkdirRecursive(path) {
        const parts = path.split("/").filter(Boolean);
        let currentPath = "";

        for (const part of parts) {
            currentPath += "/" + part;

            let node = resolvePath(currentPath);

            if (node) {
                if (node.type !== "dir") {
                    return `mkdir: ${part}: Not a directory`;
                }
                continue;
            }

            const result = getParentDirectory(currentPath);

            if (!result) {
                return `mkdir: invalid path ${currentPath}`;
            }

            result.parent.children[result.name] = {
                type: "dir",
                hidden: result.name.startsWith("."),
                children: {}
            };
        }
        return;
    }
    
    if (parents) {
        return mkdirRecursive(path);
    }

    const node = resolvePath(path);

    if (node) {
        return `mkdir: directory ${target} already exists`;
    }

    const result = getParentDirectory(path);

    if (!result) {
        return `mkdir: cannot create directory '${target}': No such file or directory`;
    }

    result.parent.children[result.name] = {
        type: "dir",
        hidden: result.name.startsWith("."),
        children: {}
    };

    return;
};

/* RMDIR - create directory */
Commands.rmdir = function (terminal, args) {
    let target = args[0];
    if (target === undefined) {
        return `rmdir: missing operand`;
    }
    const path = resolveRelativePath(terminal.cwd, target);
    const node = resolvePath(path);
    if (!node){
        return `rmdir: directory ${target} not found`;
    }
    if (node && node.type === "dir"){
        if (Object.keys(node.children).length > 0) {
            return `rmdir: failed to remove ${target}: Directory not empty`;    
        }
        else{
            const path = resolveRelativePath(terminal.cwd, target);
            const result = getParentDirectory(path);

            if (!result) {
                return `rmdir: directory ${target} not found`;
            }

            delete result.parent.children[result.name];        }
    }
    else if (node.type === "file"){
        return `rmdir: ${target} is a file please use rm`;
    }
};

/* MV - move or rename file */
Commands.mv = function (terminal, args) {
    let source = args[0];
    let destination = args[1];

    if (source === undefined || destination === undefined) {
        return `mv: missing operand`;
    }

    const sourcePath = resolveRelativePath(terminal.cwd, source);
    const destinationPath = resolveRelativePath(terminal.cwd, destination);

    const src = getParentDirectory(sourcePath);
    const dest = getParentDirectory(destinationPath);

    if (!src || !dest) {
        return `mv: invalid path`;
    }

    if (dest.parent.children[dest.name]) {
        return `mv: ${destination}: already exists`;
    }

    dest.parent.children[dest.name] = src.parent.children[src.name];

    delete src.parent.children[src.name];
};

/* CP - copy file */
Commands.cp = function (terminal, args) {
    let source = args[0];
    let destination = args[1];

    if (source === undefined || destination === undefined) {
        return `cp: missing operand`;
    }

    const sourcePath = resolveRelativePath(terminal.cwd, source);
    const destinationPath = resolveRelativePath(terminal.cwd, destination);

    const smrc = getParentDirectory(sourcePath);
    const dest = getParentDirectory(destinationPath);

    if (!src || !dest) {
        return `cp: invalid path`;
    }

    if (dest.parent.children[dest.name]) {
        return `cp: ${destination}: already exists`;
    }

    dest.parent.children[dest.name] = structuredClone(src.parent.children[src.name]);
};

/* RM - remove file */
Commands.rm = function (terminal, args) {
    const parsed = terminal.parseFlags(args,{f: false,r: false});
    const force = parsed.flags.has("f");
    const recursive = parsed.flags.has("r");
    const target = parsed.args[0];

    if (target === undefined) {
        return `rm: missing operand`;
    }

    const path = resolveRelativePath(terminal.cwd, target);
    const result = getParentDirectory(path);

    if (!result) {
        return `rm: file ${target} not found`;
    }

    const node = result.parent.children[result.name];

    if (node.type === "file") {
        delete result.parent.children[result.name];
        return;
    }

    if (!force) {
        return `rm: ${target} is a directory please use rmdir`;
    }

    if (recursive) {
        function removeChildren(dir) {
            if (!dir.children) {
                return;
            }

            for (const key of Object.keys(dir.children)) {
                const child = dir.children[key];

                if (child.type === "dir") {
                    removeChildren(child);
                }

                delete dir.children[key];
            }
        }

        if(target === "/"){
            return "rm: it is dangerous to operate recursively on '/'";
        }
        removeChildren(node);
    }
    else if (Object.keys(node.children).length > 0) {
        return `rm: cannot remove '${target}': Directory not empty`;
    }

    delete result.parent.children[result.name];    
};

/* TOUCH */
Commands.touch = function (terminal, args) {
    let target = args[0];

    if (target === undefined) {
        return `touch: missing operand`;
    }

    const path = resolveRelativePath(terminal.cwd, target);
    const node = resolvePath(path);

    if (node){
        return `touch: file ${target} already exists`;
    }

    const result = getParentDirectory(path);

    if (!result) {
        return `touch: invalid path ${target}`;
    }

    result.parent.children[result.name] = {
        type: "file",
        hidden: result.name.startsWith("."),
        content: ""
    };
};

/* PWD */
Commands.pwd = function (terminal) {
    return terminal.cwd;
};

/* RESET */
Commands.reset = function (terminal) {
    return "reset";
};

/* LS */
Commands.ls = function (terminal, args) {
    const parsed = terminal.parseFlags(args,{l: false,a: false,R: false});
    const longFormat = parsed.flags.has("l");
    const showHidden = parsed.flags.has("a");
    const recursive = parsed.flags.has("R");
    const target = parsed.args[0] || terminal.cwd;

    const path = resolveRelativePath(terminal.cwd, target);
    const node = resolvePath(path);

    if (!node || node.type !== "dir") {
        return `ls: ${target} is not a directory`;
    }

    function listDirectory(dirNode, dirPath) {
        const children = dirNode.children || {};
        const keys = Object.keys(children);

        let output = [];
        let directories = [];

        keys.forEach(name => {
            const child = children[name];

            if (!child.hidden || showHidden) {
                if (child.type === "dir") {
                    output.push(`${name}/`);
                    directories.push({
                        name,
                        node: child
                    });
                } else {
                    output.push(name);
                }
            }
        });

        if (recursive) {
            directories.forEach(dir => {
                output.push("");
                output.push(`${dirPath}${dir.name}:`);
                output.push(listDirectory(dir.node, `${dirPath}${dir.name}/`));
            });
        }
        return output.join(recursive || longFormat ? "\n" : "    ");
    }
    if (recursive) {
        return `${target}:\n${listDirectory(node, "")}`;
    }

    return listDirectory(node, "");
};

/* CD */
Commands.cd = function (terminal, args) {
    const target = args[0];
    if (!target) {
        return "cd: missing operand";
    }
    const newPath = resolveRelativePath(terminal.cwd, target);
    const node = resolvePath(newPath);
    if (!node) {
        return `cd: no such file or directory: ${target}`;
    }
    if (node.type !== "dir") {
        return `cd: not a directory: ${target}`;
    }
    terminal.cwd = newPath;
    terminal.renderPrompt();
};

/* CAT */
Commands.cat = function (terminal, args) {
    const parsed = terminal.parseFlags(args,{n: false});
    const numberLines = parsed.flags.has("n");
    const target = parsed.args[0];

    if (!target) {
        return "cat: missing file operand";
    }
    const fullPath = resolveRelativePath(terminal.cwd, target);
    const node = resolvePath(fullPath);
    if (!node) {
        return `cat: no such file: ${target}`;
    }
    if (node.type === "dir") {
        return `cat: ${target}: is a directory`;
    }
    
    if (numberLines){
        let lineNumber = 1;
        let returnContent = "";
        const content = node.content.split(/\r?\n/);
        for (const line of content) {
            returnContent += `  ${lineNumber}  ${line} \n`;
            lineNumber++;
        }
        return returnContent;
    }
    return node.content;
};

/* MORE */
Commands.more = async function (terminal, args) {
    //Add support for:
    // + start at line #
    // - limit screen size to # rows 
    const target = args[0];
    if (!target) {
        terminal.write("more: missing file operand");
        return;
    }
    const fullPath = resolveRelativePath(terminal.cwd, target);
    const node = resolvePath(fullPath);
    if (!node) {
        terminal.write(`more: no such file: ${target}`);
        return;
    }
    if (node.type === "dir") {
        terminal.write(`more: ${target}: is a directory`);
        return;
    }
    const lines = node.content.split(/\r?\n/);
    terminal.pager.linesPrinted = 0;
    for (const line of lines) {
        terminal.write(line);
        terminal.pager.linesPrinted++;
        if (terminal.pager.linesPrinted >= terminal.pager.pageSize) {
            const keepGoing = await terminal.pageBreak();
            if (keepGoing === false) {
                break;
            }
        }
        await terminal.sleep(20);
    }
};

/* TREE */
Commands.tree = function (terminal, args) {

    const parsed = terminal.parseFlags(args,{d: false,a: false,L: true});
    const onlyDirectory = parsed.flags.has("d");
    const showHidden = parsed.flags.has("a");
    const maxDepth = parsed.options?.L !== undefined
        ? parseInt(parsed.options.L, 10)
        : Infinity;

    const target = parsed.args[0] || terminal.cwd;
    const path = resolveRelativePath(terminal.cwd, target);
    const root = resolvePath(path);

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
            output += `${prefix}${connector}${key}${child.type === "dir" ? "/" : ""}\n`;

            if (child.type === "dir" && depth < maxDepth) {
                const nextPrefix = prefix + (isLast ? "    " : "│   ");
                output += walk(child, nextPrefix, depth + 1);
            }
        });
        return output;
    }
    return ".\n" + walk(root);
};

/* WHOAMI */
Commands.whoami = function () {
    return "guest";
};

/* CLEAR */
Commands.clear = function (terminal) {
    terminal.clearScreen();
    return;
};

/* ECHO */
Commands.echo = function (_terminal, args) {    
    return args.join(" ");
};

/* HISTORY */
Commands.history = function (terminal) {
    return terminal.history.join("\n");
};

/* PS - list processes*/
Commands.ps = function (terminal) {
    return "guest users are not permitted to list processes.";
};

/* KILL - kill process */
Commands.kill = function (terminal) {
    return "guest users are not permitted to kill processes.";
};

/* DF - report total, used, and available storage space */
Commands.df = function (terminal) {
    return "guest users are not permitted view storage information.";
};

/* FREE - display free and used memory */
Commands.free = function (terminal) {
    return "guest users are not permitted view memory information.";
};

/* PING */
Commands.ping = function (terminal) {
    return "guest users are not permitted to run the ping command.";
};

/* CURL - download file/site */
Commands.curl = function (terminal) {
    return "guest users are not permitted to run the curl command.";
};

/* WGET - download file/site */
Commands.wget = function (terminal) {
    return "guest users are not permitted to run the wget command.";
};

/* FINGER - user info look up */
Commands.finger = function (terminal) {
    return "guest users are not permitted to run the finger command.";
};
