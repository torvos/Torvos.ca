window.Commands = {};

window.resolvePath = function (path) {
    const parts = path.replace("~", "").split(ROOT).filter(Boolean);
    let node = window.FileSystem[ROOT];
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
        for (const part of path.split(ROOT)) {
            if (!part || part === ".") {continue;}
            if (part === "..") {
                if (parts.length > 0) {
                    parts.pop();
                }
                continue;
            }
            parts.push(part);
        }
        return ROOT + parts.join(ROOT);
    }

    if (!path || path === ".") {return cwd;}
    if (path === "~") {return HOME;}
    if (path.startsWith("~/")) {path = HOME + path.slice(1);}
    if (path.startsWith(ROOT)) {return normalizePath(path);}
    return normalizePath(`${cwd}/${path}`);
};

window.getParentDirectory = function (path) {
    const parts = path.split(ROOT).filter(Boolean);
    if (parts.length === 0) {return null;}
    const name = parts.pop();
    let parent = window.FileSystem[ROOT];
    for (const part of parts) {
        if (!parent.children || !parent.children[part]) {return null;}
        parent = parent.children[part];
        if (parent.type !== "dir") {return null;}
    }
    return {parent,name};
};

window.formatSize = function(bytes) {
    if (bytes < 1024) {
        return `${bytes}B`;
    }
    const units = ["K", "M", "G", "T"];
    let size = bytes;
    for (const unit of units) {
        size /= 1024;
        if (size < 1024) {
            return `${size.toFixed(1)}${unit}`;
        }
    }
    return `${size.toFixed(1)}P`;
};

window.getDirectorySize = function(node) {
    if (!node) {
        return 0;
    }
    if (node.type === "file") {
        return new TextEncoder().encode(node.content || "").length;
    }
    let total = 0;
    for (const child of Object.values(node.children || {})) {
        total += getDirectorySize(child);
    }
    return total;
};

window.getSize = function (node) {
    if (node.type === "file")
        return new TextEncoder().encode(node.content).length;
    return Object.keys(node.children).length;
};

window.formatDate = function (timestamp) {
    return new Date(timestamp).toLocaleString("en-CA", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
};

window.getLinkCount = function(node) {
    if (node.type === "file") {
        return 1;
    }
    const subdirs = Object.values(node.children || {})
        .filter(child => child.type === "dir")
        .length;

    return 2 + subdirs;
};

window.formatLongEntry = function(name, node) {

    const typeChar = node.type === "dir" ? "d" : "-";
    const mode = node.mode;
    const links = getLinkCount(node);
    const owner = node.owner;
    const group = node.group;
    const size = getDirectorySize(node);
    const modified = formatDate(node.modified);

    return `${typeChar}${mode} ${String(links).padStart(2)} ${owner.padEnd(8)} ${group.padEnd(8)} ${String(size).padStart(6)} ${modified} ${name}${node.type === "dir" ? "/" : ""}`;
};

window.createFile = function(hidden = false) {
    const now = Date.now();

    return {
        type: "file",
        hidden,
        mode: "rw-r--r--",
        owner: "guest",
        group: "guest",
        created: now,
        modified: now,
        accessed: now,
        content: ""
    };
};

window.createDirectory = function(hidden = false) {
    const now = Date.now();

    return {
        type: "dir",
        hidden,
        mode: "rwxr-xr-x",
        owner: "guest",
        group: "guest",
        created: now,
        modified: now,
        accessed: now,
        children: {}
    };
};

/* HELP */
Commands.help = function (terminal, args, stdin) {
    return {
        stdout: `Torvos Terminal Commands
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
|  edit <file>               Edit file contents                      |
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
+--------------------------------------------------------------------+`,
        stderr: "",
        exitCode: 0
    };
};

/* SUDO */
Commands.sudo = function (terminal, args, stdin) {
    return {
        stdout: "",
        stderr: "guest users are not allowed to invoke sudo, this incident will be reported.",
        exitCode: 1
    };
};

/* EDIT */
Commands.edit = function (terminal, args, stdin) {
    const target = args[0];
    if (!target){
        return {
            stdout: "",
            stderr: "edit: missing operand",
            exitCode: 1
        };        
    }
    const path = resolveRelativePath(terminal.cwd,target);

    let node = resolvePath(path);

    if (!node) {
        const result = getParentDirectory(path);
        result.parent.children[result.name] = createFile(result.name.startsWith("."));
    }

    if (node.type !== "file"){
        return {
            stdout: "",
            stderr: `edit: ${target}: Is a directory`,
            exitCode: 1
        };                
    }

    terminal.openEditor(node, path);

    return {
        stdout: "",
        stderr: "",
        exitCode: 0
    };
};

/* HEAD */
Commands.head = function (terminal, args, stdin) {
    const parsed = terminal.parseFlags(args,{n: true});
    const maxDepth = parsed.options?.n !== undefined
        ? parseInt(parsed.options.n, 10)
        : 10;
    const target = parsed.args[0];
    let content = "";
    
    if (!target) {
        if (!stdin) {
            return {
                stdout: "",
                stderr: "head: missing file operand",
                exitCode: 1
            };
        }
        content = stdin;
    } else {
        const fullPath = resolveRelativePath(terminal.cwd, target);
        const node = resolvePath(fullPath);
        if (!node) {
            return {
                stdout: "",
                stderr: `head: no such file: ${target}`,
                exitCode: 1
            };
        }
        if (node.type === "dir") {
            return {
                stdout: "",
                stderr: `head: ${target}: is a directory`,
                exitCode: 1
            };
        }
        node.accessed = Date.now();
        content = node.content;
    }

    return {
        stdout: content
            .split(/\r?\n/)
            .slice(0,maxDepth)
            .join("\n"),
        stderr: "",
        exitCode: 0
    };
};

/* TAIL */
Commands.tail = function (terminal, args, stdin) {
    const parsed = terminal.parseFlags(args,{n: true});
    const maxDepth = parsed.options?.n !== undefined
        ? parseInt(parsed.options.n, 10)
        : 10;
    const target = parsed.args[0];
    
    let content = "";

    if (!target) {

        if (!stdin) {
            return {
                stdout: "",
                stderr: "tail: missing file operand",
                exitCode: 1
            };
        }

        content = stdin;

    } else {

        const fullPath = resolveRelativePath(terminal.cwd, target);
        const node = resolvePath(fullPath);

        if (!node) {
            return {
                stdout: "",
                stderr: `tail: no such file: ${target}`,
                exitCode: 1
            };
        }

        if (node.type === "dir") {
            return {
                stdout: "",
                stderr: `tail: ${target}: is a directory`,
                exitCode: 1
            };
        }

        node.accessed = Date.now();
        content = node.content;
    }


    return {
        stdout: content
            .split(/\r?\n/)
            .slice(-maxDepth)
            .join("\n"),

        stderr: "",
        exitCode: 0
    };
};

/* MKDIR */
Commands.mkdir = function (terminal, args, stdin) {
    const parsed = terminal.parseFlags(args, { p: false });
    const parents = parsed.flags.has("p");
    const target = parsed.args[0];

    if (!target) {
        return {
            stdout: "",
            stderr: "mkdir: missing operand",
            exitCode: 1
        };        

    }

    const path = resolveRelativePath(terminal.cwd, target);

    function mkdirRecursive(path) {
        const parts = path.split(ROOT).filter(Boolean);
        let currentPath = "";

        for (const part of parts) {
            currentPath += ROOT + part;

            let node = resolvePath(currentPath);

            if (node) {
                if (node.type !== "dir") {
                    return {
                        stdout: "",
                        stderr: `mkdir: ${part}: Not a directory`,
                        exitCode: 1
                    };        

                }
                continue;
            }

            const result = getParentDirectory(currentPath);

            if (!result) {
                return {
                    stdout: "",
                    stderr: `mkdir: invalid path ${currentPath}`,
                    exitCode: 1
                };        
            }
            result.parent.modified = Date.now();
            result.parent.children[result.name] = createDirectory(result.name.startsWith("."));
        }

        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };     
    }
    
    if (parents) {
        mkdirRecursive(path); 
        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };         
    }

    const node = resolvePath(path);

    if (node) {
        return {
            stdout: "",
            stderr: `mkdir: directory ${target} already exists`,
            exitCode: 1
        };           
    }

    const result = getParentDirectory(path);

    if (!result) {
        return {
            stdout: "",
            stderr: `mkdir: cannot create directory '${target}': No such file or directory`,
            exitCode: 1
        };           
    }
    
    result.parent.modified = Date.now();
    result.parent.children[result.name] = createDirectory(result.name.startsWith("."));

    return {
        stdout: "",
        stderr: "",
        exitCode: 0
    };
};

/* RMDIR */
Commands.rmdir = function (terminal, args, stdin) {
    let target = args[0];
    if (target === undefined) {
        return {
            stdout: "",
            stderr: `rmdir: missing operand`,
            exitCode: 1
        };          
    }
    const path = resolveRelativePath(terminal.cwd, target);
    const node = resolvePath(path);
    if (!node){
        return {
            stdout: "",
            stderr: `rmdir: directory ${target} not found`,
            exitCode: 1
        };          
    }
    if (node && node.type === "dir"){
        if (Object.keys(node.children).length > 0) {
            return {
                stdout: "",
                stderr: `rmdir: failed to remove ${target}: Directory not empty`,
                exitCode: 1
            };           
        }
        else{
            const path = resolveRelativePath(terminal.cwd, target);
            const result = getParentDirectory(path);

            if (!result) {
                return {
                    stdout: "",
                    stderr: `rmdir: directory ${target} not found`,
                    exitCode: 1
                };           
            }

            result.parent.modified = Date.now();
            delete result.parent.children[result.name];       
            return {
                stdout: "",
                stderr: "",
                exitCode: 0
            };            
        }
    }
    else if (node.type === "file"){
        return {
            stdout: "",
            stderr: `rmdir: ${target} is a file please use rm`,
            exitCode: 1
        };           

    }
};

/* MV */
Commands.mv = function (terminal, args, stdin) {
    let source = args[0];
    let destination = args[1];

    if (source === undefined || destination === undefined) {
        return {
            stdout: "",
            stderr: `mv: missing operand`,
            exitCode: 1
        };           
    }

    const sourcePath = resolveRelativePath(terminal.cwd, source);
    const destinationPath = resolveRelativePath(terminal.cwd, destination);

    const src = getParentDirectory(sourcePath);
    const dest = getParentDirectory(destinationPath);

    if (!src || !dest) {
        return {
            stdout: "",
            stderr: `mv: invalid path`,
            exitCode: 1
        };   
    }

    if (dest.parent.children[dest.name]) {
        return {
            stdout: "",
            stderr: `mv: ${destination}: already exists`,
            exitCode: 1
        };           
    }

    src.parent.modified = Date.now();
    dest.parent.modified = Date.now();

    dest.parent.children[dest.name] = src.parent.children[src.name];

    delete src.parent.children[src.name];

    return {
        stdout: "",
        stderr: "",
        exitCode: 0
    };    
};

/* CP */
Commands.cp = function (terminal, args, stdin) {
    let source = args[0];
    let destination = args[1];

    if (source === undefined || destination === undefined) {
        return {
            stdout: "",
            stderr: `cp: missing operand`,
            exitCode: 1
        };    
    }

    const sourcePath = resolveRelativePath(terminal.cwd, source);
    const destinationPath = resolveRelativePath(terminal.cwd, destination);

    const src = getParentDirectory(sourcePath);
    const dest = getParentDirectory(destinationPath);

    if (!src || !dest) {
        return {
            stdout: "",
            stderr: `cp: invalid path`,
            exitCode: 1
        };    
    }

    if (dest.parent.children[dest.name]) {
        return {
            stdout: "",
            stderr: `cp: ${destination}: already exists`,
            exitCode: 1
        };    
    }

    src.parent.modified = Date.now();
    dest.parent.modified = Date.now();

    const copy = structuredClone(src.parent.children[src.name]);
    const now = Date.now();
    copy.created = now;
    copy.modified = now;
    copy.accessed = now;
    dest.parent.children[dest.name] = copy;

    return {
        stdout: "",
        stderr: "",
        exitCode: 0
    };
};

/* RM */
Commands.rm = function (terminal, args, stdin) {
    const parsed = terminal.parseFlags(args,{f: false,r: false});
    const force = parsed.flags.has("f");
    const recursive = parsed.flags.has("r");
    const target = parsed.args[0];

    if (target === undefined) {
        return {
            stdout: "",
            stderr: `rm: missing operand`,
            exitCode: 1
        };    
    }

    const path = resolveRelativePath(terminal.cwd, target);
    const result = getParentDirectory(path);

    if (!result || !result.parent.children[result.name]) {
        if (force) {
            return {
                stdout: "",
                stderr: "",
                exitCode: 0
            };    
        }
        return {
            stdout: "",
            stderr: `rm: cannot remove '${target}': No such file or directory`,
            exitCode: 1
        };   
    }

    const node = result.parent.children[result.name];

    if (node.type === "file") {
        delete result.parent.children[result.name];
        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };   
    }

    if (!force) {
        return {
            stdout: "",
            stderr: `rm: ${target} is a directory please use rmdir`,
            exitCode: 1
        };                  
    }

    if (recursive) {
        function removeChildren(dir) {
            if (!dir.children) {
                return {
                    stdout: "",
                    stderr: "",
                    exitCode: 0
                };
            }

            for (const key of Object.keys(dir.children)) {
                const child = dir.children[key];

                if (child.type === "dir") {
                    removeChildren(child);
                }

                delete dir.children[key];
            }
        }

        if(target === ROOT){
            return {
                stdout: "",
                stderr: "rm: it is dangerous to operate recursively on '/'",
                exitCode: 1
            };          
        }
        removeChildren(node);
    }
    else if (Object.keys(node.children).length > 0) {
        return {
            stdout: "",
            stderr: `rm: cannot remove '${target}': Directory not empty`,
            exitCode: 1
        };          
    }

    result.parent.modified = Date.now();
    delete result.parent.children[result.name];    

    return {
        stdout: "",
        stderr: "",
        exitCode: 0
    };    
};

/* TOUCH */
Commands.touch = function (terminal, args, stdin) {
    let target = args[0];

    if (target === undefined) {
        return {
            stdout: "",
            stderr: `touch: missing operand`,
            exitCode: 1
        };           
    }

    const path = resolveRelativePath(terminal.cwd, target);
    const node = resolvePath(path);

    if (node){
        return {
            stdout: "",
            stderr: `touch: file ${target} already exists`,
            exitCode: 1
        };           
    }

    const result = getParentDirectory(path);

    if (!result) {
        return {
            stdout: "",
            stderr: `touch: invalid path ${target}`,
            exitCode: 1
        };           
    }

    result.parent.modified = Date.now();
    result.parent.children[result.name] = createFile(result.name.startsWith("."));

    return {
        stdout: "",
        stderr: "",
        exitCode: 0
    };    
};

/* PWD */
Commands.pwd = function (terminal, args, stdin) {
    return {
        stdout: terminal.cwd,
        stderr: "",
        exitCode: 0
    };                  
};

/* RESET */
Commands.reset = function (terminal, args, stdin) {
    return {
        stdout: "reset",
        stderr: "",
        exitCode: 0
    };                  
};

/* LS */
Commands.ls = function (terminal, args, stdin) {
    const parsed = terminal.parseFlags(args,{l: false,a: false,R: false});
    const longFormat = parsed.flags.has("l");
    const showHidden = parsed.flags.has("a");
    const recursive = parsed.flags.has("R");
    const target = parsed.args[0] || terminal.cwd;

    const path = resolveRelativePath(terminal.cwd, target);
    const node = resolvePath(path);

    if (!node || node.type !== "dir") {
        return {
            stdout:"",
            stderr: `ls: ${target} is not a directory`,
            exitCode: 1
        };                  
    }

    function listDirectory(dirNode, dirPath) {
        dirNode.accessed = Date.now();
        const children = dirNode.children || {};
        const keys = Object.keys(children);

        let output = [];
        let directories = [];

        keys.forEach(name => {
            const child = children[name];

            if (child.hidden && !showHidden)
                return;

            if (longFormat) {
                output.push(formatLongEntry(name, child));
            } else {
                output.push(child.type === "dir" ? `${name}/` : name);
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
                output.push("");
                output.push(`${dirPath}${dir.name}:`);
                output.push(listDirectory(dir.node, `${dirPath}${dir.name}/`));
            });
        }
        return output.join(recursive || longFormat ? "\n" : "    ");          
    }
    if (recursive) {
        return {
            stdout: `${target}:\n${listDirectory(node, "")}`,
            stderr: "",
            exitCode: 0
        };         
    }

    return {
        stdout: listDirectory(node, ""),
        stderr: "",
        exitCode: 0
    }; 

};

/* CD */
Commands.cd = function (terminal, args, stdin) {
    const target = args[0];
    if (!target) {
        return {
            stdout: "",
            stderr: "cd: missing operand",
            exitCode: 1
        }; 

    }
    const newPath = resolveRelativePath(terminal.cwd, target);
    const node = resolvePath(newPath);
    if (!node) {
        return {
            stdout: "",
            stderr: `cd: no such file or directory: ${target}`,
            exitCode: 1
        }; 

    }
    if (node.type !== "dir") {
        return {
            stdout: "",
            stderr: `cd: not a directory: ${target}`,
            exitCode: 1
        }; 
    }
    node.accessed = Date.now();
    terminal.cwd = newPath;
    terminal.renderPrompt();

    return {
        stdout: "",
        stderr: "",
        exitCode: 0
    };    
};

/* CAT */
Commands.cat = function (terminal, args, stdin) {
    const parsed = terminal.parseFlags(args,{n: false});
    const numberLines = parsed.flags.has("n");
    const target = parsed.args[0];

    if (!target) {
        if (!stdin) {
            return {
                stdout: "",
                stderr: "cat: missing file operand",
                exitCode: 1
            };
        }

        content = stdin;
    } else {
        const fullPath = resolveRelativePath(terminal.cwd, target);
        const node = resolvePath(fullPath);
        if (!node) {
            return {
                stdout: "",
                stderr: `cat: no such file: ${target}`,
                exitCode: 1
            };         
        }
        if (node.type === "dir") {
            return {
                stdout: "",
                stderr: `cat: ${target}: is a directory`,
                exitCode: 1
            };         
        }
        node.accessed = Date.now();
        content = node.content;
    }

    if (numberLines){        
        let lineNumber = 1;
        let returnContent = "";
        let contents = content.split(/\r?\n/);
        for (const line of contents) {
            returnContent += `  ${lineNumber}  ${line} \n`;
            lineNumber++;
        }
        content = returnContent.replace(/\r?\n$/, "");
    }

    return {
        stdout: content,
        stderr: "",
        exitCode: 0
    };    
};

/* MORE */
Commands.more = async function (terminal, args, stdin) {
    const target = args[0];
    if (!target) {
        return {
            stdout: "",
            stderr: "more: missing file operand",
            exitCode: 1
        };        
    }
    const fullPath = resolveRelativePath(terminal.cwd, target);
    const node = resolvePath(fullPath);
    if (!node) {
        return {
            stdout: "",
            stderr: `more: no such file: ${target}`,
            exitCode: 1
        };        
    }
    if (node.type === "dir") {
        return {
            stdout: "",
            stderr: `more: ${target}: is a directory`,
            exitCode: 1
        };
    }

    node.accessed = Date.now();
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
Commands.tree = function (terminal, args, stdin) {
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
            output += `${prefix}${connector}${key}${child.type === "dir" ? ROOT : ""}\n`;

            if (child.type === "dir" && depth < maxDepth) {
                const nextPrefix = prefix + (isLast ? "    " : "│   ");
                output += walk(child, nextPrefix, depth + 1);
            }
        });
        return output;
    }
    return {
        stdout: walk(root).replace(/\r?\n$/, ""),
        stderr: "",
        exitCode: 0
    };
};

/* WHOAMI */
Commands.whoami = function (terminal, args, stdin) {
    return {
        stdout: DEFAULT_USER,
        stderr: "",
        exitCode: 0
    };
};

/* CLEAR */
Commands.clear = function (terminal, args, stdin) {
    terminal.clearScreen();
    return {
        stdout: "",
        stderr: "",
        exitCode: 0
    };
};

/* ECHO */
Commands.echo = function (terminal, args, stdin) {    
    return {
        stdout: args.join(" "),
        stderr: "",
        exitCode: 0
    };
};

/* HISTORY */
Commands.history = function (terminal, args, stdin) {
        return {
        stdout: terminal.history.join("\n"),
        stderr: "",
        exitCode: 0
    };
};

/* PS */
Commands.ps = function (terminal, args, stdin) {
        return {
        stdout: "",
        stderr: "guest users are not permitted to list processes.",
        exitCode: 1
    };
};

/* KILL */
Commands.kill = function (terminal, args, stdin) {
        return {
        stdout: "",
        stderr: "guest users are not permitted to kill processes.",
        exitCode: 1
    };
};

/* DF */
Commands.df = function (terminal, args, stdin) {
        return {
        stdout: "",
        stderr: "guest users are not permitted view storage information.",
        exitCode: 1
    };
};

/* FREE */
Commands.free = function (terminal, args, stdin) {
        return {
        stdout: "guest users are not permitted view memory information.",
        stderr: "",
        exitCode: 0
    };
};

/* PING */
Commands.ping = function (terminal, args, stdin) {
        return {
        stdout: "",
        stderr: "guest users are not permitted to run the ping command.",
        exitCode: 1
    };
};

/* CURL */
Commands.curl = function (terminal, args, stdin) {
        return {
        stdout: "",
        stderr: "guest users are not permitted to run the curl command.",
        exitCode: 1
    };
};

/* WGET */
Commands.wget = function (terminal, args, stdin) {
        return {
        stdout: "",
        stderr: "guest users are not permitted to run the wget command.",
        exitCode: 1
    };
};

/* FINGER */
Commands.finger = function (terminal, args, stdin) {
        return {
        stdout: "",
        stderr: "guest users are not permitted to run the finger command.",
        exitCode: 1
    };
};

/* GREP */
Commands.grep = function (terminal, args, stdin) {
    const pattern = args[0];
    if (!pattern) {
        return {
            stdout: "",
            stderr: "grep: missing pattern",
            exitCode: 1
        };
    }
    let content = stdin;
    if (!content) {
        return {
            stdout: "",
            stderr: "grep: no input",
            exitCode: 1
        };
    }
    const lines = content.split(/\r?\n/);
    const matches = lines.filter(line =>
        line.includes(pattern)
    );
    return {
        stdout: matches.join("\n"),
        stderr: "",
        exitCode: matches.length ? 0 : 1
    };
};

//Redirection
//Environment variables
//Aliases