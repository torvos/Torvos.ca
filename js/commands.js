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
        stdout: "guest users are not allowed to invoke sudo, this incident will be reported.",
        stderr: "",
        exitCode: 0
    };
};

/* EDIT */
Commands.edit = function (terminal, args, stdin) {
    const target = args[0];
    if (!target){
        return {
            stdout: "edit: missing operand",
            stderr: "",
            exitCode: 0
        };        
    }
    const path = resolveRelativePath(terminal.cwd,target);

    let node = resolvePath(path);

    if (!node) {
        const result = getParentDirectory(path);
        result.parent.children[result.name] = {
            type: "file",
            hidden: result.name.startsWith("."),
            content: ""
        };
    }

    if (node.type !== "file"){
        return {
            stdout: `edit: ${target}: Is a directory`,
            stderr: "",
            exitCode: 0
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

    if (args.length === 0){
        return {
            stdout: `head: missing file operand`,
            stderr: "",
            exitCode: 0
        };        
    }
    for (const arg of args) {
        const fullPath = resolveRelativePath(terminal.cwd, arg);
        const node = resolvePath(fullPath);
        if (node != null){
            if (!node) {
                return {
                    stdout: `head: no such file: ${arg}`,
                    stderr: "",
                    exitCode: 0
                };        
            }
            if (node.type === "dir") {
                return {
                    stdout: `head: ${arg}: is a directory`,
                    stderr: "",
                    exitCode: 0
                };        
            }
            if (node && node.type === "file") {
                const content = node.content.split(/\r?\n/);
                return {
                    stdout: content.slice(0, maxDepth).join(`\n`),
                    stderr: "",
                    exitCode: 0
                };        
            }
        }
    }
};

/* TAIL */
Commands.tail = function (terminal, args, stdin) {
    const parsed = terminal.parseFlags(args,{n: true});
    const maxDepth = parsed.options?.n !== undefined
        ? parseInt(parsed.options.n, 10)
        : 10;

    if (args.length === 0){        
        return {
            stdout: `tail: missing file operand`,
            stderr: "",
            exitCode: 0
        };
    }
    for (const arg of args) {
        const fullPath = resolveRelativePath(terminal.cwd, arg);
        const node = resolvePath(fullPath);
        if (node != null){
            if (!node) {
                return {
                    stdout: `tail: no such file: ${arg}`,
                    stderr: "",
                    exitCode: 0
                };        
            }
            if (node.type === "dir") {
                return {
                    stdout: `tail: ${arg}: is a directory`,
                    stderr: "",
                    exitCode: 0
                };        
            }
            if (node && node.type === "file") {
                const content = node.content.split(/\r?\n/);
                return {
                    stdout: content.slice(-maxDepth).join("\n"),
                    stderr: "",
                    exitCode: 0
                };                        
            }
        }
    }
};

/* MKDIR */
Commands.mkdir = function (terminal, args, stdin) {
    const parsed = terminal.parseFlags(args, { p: false });
    const parents = parsed.flags.has("p");
    const target = parsed.args[0];

    if (!target) {
        return {
            stdout: "mkdir: missing operand",
            stderr: "",
            exitCode: 0
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
                        stdout: `mkdir: ${part}: Not a directory`,
                        stderr: "",
                        exitCode: 0
                    };        

                }
                continue;
            }

            const result = getParentDirectory(currentPath);

            if (!result) {
                return {
                    stdout: `mkdir: invalid path ${currentPath}`,
                    stderr: "",
                    exitCode: 0
                };        
            }

            result.parent.children[result.name] = {
                type: "dir",
                hidden: result.name.startsWith("."),
                children: {}
            };
        }
        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };        
    }
    
    if (parents) {
        return {
            stdout: mkdirRecursive(path),
            stderr: "",
            exitCode: 0
        };         
    }

    const node = resolvePath(path);

    if (node) {
        return {
            stdout: `mkdir: directory ${target} already exists`,
            stderr: "",
            exitCode: 0
        };           
    }

    const result = getParentDirectory(path);

    if (!result) {
        return {
            stdout: `mkdir: cannot create directory '${target}': No such file or directory`,
            stderr: "",
            exitCode: 0
        };           
    }

    result.parent.children[result.name] = {
        type: "dir",
        hidden: result.name.startsWith("."),
        children: {}
    };

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
            stdout: `rmdir: missing operand`,
            stderr: "",
            exitCode: 0
        };          
    }
    const path = resolveRelativePath(terminal.cwd, target);
    const node = resolvePath(path);
    if (!node){
        return {
            stdout: `rmdir: directory ${target} not found`,
            stderr: "",
            exitCode: 0
        };          
    }
    if (node && node.type === "dir"){
        if (Object.keys(node.children).length > 0) {
            return {
                stdout: `rmdir: failed to remove ${target}: Directory not empty`,
                stderr: "",
                exitCode: 0
            };           
        }
        else{
            const path = resolveRelativePath(terminal.cwd, target);
            const result = getParentDirectory(path);

            if (!result) {
                return {
                    stdout: `rmdir: directory ${target} not found`,
                    stderr: "",
                    exitCode: 0
                };           
            }

            delete result.parent.children[result.name];       
        }
    }
    else if (node.type === "file"){
        return {
            stdout: `rmdir: ${target} is a file please use rm`,
            stderr: "",
            exitCode: 0
        };           

    }
};

/* MV */
Commands.mv = function (terminal, args, stdin) {
    let source = args[0];
    let destination = args[1];

    if (source === undefined || destination === undefined) {
        return {
            stdout: `mv: missing operand`,
            stderr: "",
            exitCode: 0
        };           
    }

    const sourcePath = resolveRelativePath(terminal.cwd, source);
    const destinationPath = resolveRelativePath(terminal.cwd, destination);

    const src = getParentDirectory(sourcePath);
    const dest = getParentDirectory(destinationPath);

    if (!src || !dest) {
        return {
            stdout: `mv: invalid path`,
            stderr: "",
            exitCode: 0
        };   
    }

    if (dest.parent.children[dest.name]) {
        return {
            stdout: `mv: ${destination}: already exists`,
            stderr: "",
            exitCode: 0
        };           
    }

    dest.parent.children[dest.name] = src.parent.children[src.name];

    delete src.parent.children[src.name];
};

/* CP */
Commands.cp = function (terminal, args, stdin) {
    let source = args[0];
    let destination = args[1];

    if (source === undefined || destination === undefined) {
        return {
            stdout: `cp: missing operand`,
            stderr: "",
            exitCode: 0
        };    
    }

    const sourcePath = resolveRelativePath(terminal.cwd, source);
    const destinationPath = resolveRelativePath(terminal.cwd, destination);

    const src = getParentDirectory(sourcePath);
    const dest = getParentDirectory(destinationPath);

    if (!src || !dest) {
        return {
            stdout: `cp: invalid path`,
            stderr: "",
            exitCode: 0
        };    
    }

    if (dest.parent.children[dest.name]) {
        return {
            stdout: `cp: ${destination}: already exists`,
            stderr: "",
            exitCode: 0
        };    
    }

    dest.parent.children[dest.name] = structuredClone(src.parent.children[src.name]);
};

/* RM */
Commands.rm = function (terminal, args, stdin) {
    const parsed = terminal.parseFlags(args,{f: false,r: false});
    const force = parsed.flags.has("f");
    const recursive = parsed.flags.has("r");
    const target = parsed.args[0];

    if (target === undefined) {
        return {
            stdout: `rm: missing operand`,
            stderr: "",
            exitCode: 0
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
            stdout: `rm: cannot remove '${target}': No such file or directory`,
            stderr: "",
            exitCode: 0
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
            stdout: `rm: ${target} is a directory please use rmdir`,
            stderr: "",
            exitCode: 0
        };                  
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

        if(target === ROOT){
            return {
                stdout: "rm: it is dangerous to operate recursively on '/'",
                stderr: "",
                exitCode: 0
            };          
        }
        removeChildren(node);
    }
    else if (Object.keys(node.children).length > 0) {
        return {
            stdout: `rm: cannot remove '${target}': Directory not empty`,
            stderr: "",
            exitCode: 0
        };          
    }

    delete result.parent.children[result.name];    
};

/* TOUCH */
Commands.touch = function (terminal, args, stdin) {
    let target = args[0];

    if (target === undefined) {
        return {
            stdout: `touch: missing operand`,
            stderr: "",
            exitCode: 0
        };           
    }

    const path = resolveRelativePath(terminal.cwd, target);
    const node = resolvePath(path);

    if (node){
        return {
            stdout: `touch: file ${target} already exists`,
            stderr: "",
            exitCode: 0
        };           
    }

    const result = getParentDirectory(path);

    if (!result) {
        return {
            stdout: `touch: invalid path ${target}`,
            stderr: "",
            exitCode: 0
        };           
    }

    result.parent.children[result.name] = {
        type: "file",
        hidden: result.name.startsWith("."),
        content: ""
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
            stdout:`ls: ${target} is not a directory`,
            stderr: "",
            exitCode: 0
        };                  
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
        return {
            stdout: output.join(recursive || longFormat ? "\n" : "    "),
            stderr: "",
            exitCode: 0
        };          
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
            stdout: "cd: missing operand",
            stderr: "",
            exitCode: 0
        }; 

    }
    const newPath = resolveRelativePath(terminal.cwd, target);
    const node = resolvePath(newPath);
    if (!node) {
        return {
            stdout: `cd: no such file or directory: ${target}`,
            stderr: "",
            exitCode: 0
        }; 

    }
    if (node.type !== "dir") {
        return {
            stdout: `cd: not a directory: ${target}`,
            stderr: "",
            exitCode: 0
        }; 
    }
    terminal.cwd = newPath;
    terminal.renderPrompt();
};

/* CAT */
Commands.cat = function (terminal, args, stdin) {
    const parsed = terminal.parseFlags(args,{n: false});
    const numberLines = parsed.flags.has("n");
    const target = parsed.args[0];

    if (!target) {
        return {
            stdout: "cat: missing file operand",
            stderr: "",
            exitCode: 0
        }; 
    }
    const fullPath = resolveRelativePath(terminal.cwd, target);
    const node = resolvePath(fullPath);
    if (!node) {
        return {
            stdout: `cat: no such file: ${target}`,
            stderr: "",
            exitCode: 0
        };         
    }
    if (node.type === "dir") {
        return {
            stdout: `cat: ${target}: is a directory`,
            stderr: "",
            exitCode: 0
        };         
    }
    
    if (numberLines){
        let lineNumber = 1;
        let returnContent = "";
        const content = node.content.split(/\r?\n/);
        for (const line of content) {
            returnContent += `  ${lineNumber}  ${line} \n`;
            lineNumber++;
        }
        return {
            stdout: returnContent,
            stderr: "",
            exitCode: 0
        };        
    }
    return {
        stdout: node.content,
        stderr: "",
        exitCode: 0
    };    
};

/* MORE */
Commands.more = async function (terminal, args, stdin) {
    const target = args[0];
    if (!target) {
        return {
            stdout: "more: missing file operand",
            stderr: "",
            exitCode: 0
        };        
    }
    const fullPath = resolveRelativePath(terminal.cwd, target);
    const node = resolvePath(fullPath);
    if (!node) {
        return {
            stdout: `more: no such file: ${target}`,
            stderr: "",
            exitCode: 0
        };        
    }
    if (node.type === "dir") {
        return {
            stdout: `more: ${target}: is a directory`,
            stderr: "",
            exitCode: 0
        };
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
        return {
            stdout: output,
            stderr: "",
            exitCode: 0
        };
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
    };};

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
        stdout: "guest users are not permitted to list processes.",
        stderr: "",
        exitCode: 0
    };
};

/* KILL */
Commands.kill = function (terminal, args, stdin) {
        return {
        stdout: "guest users are not permitted to kill processes.",
        stderr: "",
        exitCode: 0
    };
};

/* DF */
Commands.df = function (terminal, args, stdin) {
        return {
        stdout: "guest users are not permitted view storage information.",
        stderr: "",
        exitCode: 0
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
        stdout: "guest users are not permitted to run the ping command.",
        stderr: "",
        exitCode: 0
    };
};

/* CURL */
Commands.curl = function (terminal, args, stdin) {
        return {
        stdout: "guest users are not permitted to run the curl command.",
        stderr: "",
        exitCode: 0
    };
};

/* WGET */
Commands.wget = function (terminal, args, stdin) {
        return {
        stdout: "guest users are not permitted to run the wget command.",
        stderr: "",
        exitCode: 0
    };
};

/* FINGER */
Commands.finger = function (terminal, args, stdin) {
        return {
        stdout: "guest users are not permitted to run the finger command.",
        stderr: "",
        exitCode: 0
    };
};

//GREP
//Pipes
//Redirection
//Environment variables
//Aliases