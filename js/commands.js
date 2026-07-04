window.Commands = {};

/* HELP */
Commands.help = function () {
    return `Torvos Terminal Commands
Navigation:
  ls              List directory contents
  cd <dir>        Change directory
  cd ..           Return to parent directory
  pwd             Print working directory
  tree            Show directory structure
Files:
  cat <file>                Display file contents
  head -n <number> <file>   Outputs the beginning portion of a file
  tail -n <number> <file>   Outputs the last portion of a file 
  more <file>               Display file one screen at a time
  pager <file>              Display file one screen at a time
System:
  help            Show this help message
  clear           Clear terminal
  whoami          Show current user
  login           Login to a diffrent user account
  sudo            Execute commands with administrative
  history         Displays history of commands
  echo <text>     Displays the text on the terminal`;
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
                return `head: no such file: ${target}`;
            }
            if (node.type === "dir") {
                return `head: ${target}: is a directory`;
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
                return `tail: no such file: ${target}`;
            }
            if (node.type === "dir") {
                return `tail: ${target}: is a directory`;
            }
            if (node && node.type === "file") {
                return node.content;
            }
        }
    }
};

/* PS - list processes*/
Commands.ps = function (terminal) {
    return "guest users are not permitted to list processes.";
};

/* KILL - kill process */
Commands.kill = function (terminal) {
    return "guest users are not permitted to kill processes.";
};

/* MKDIR - create directory */
Commands.mkdir = function (terminal) {
    return "guest users are not permitted to create directories.";
};

/* RMDIR - create directory */
Commands.rmdir = function (terminal) {
    return "guest users are not permitted to remove directories.";
};

/* MV - move or rename file */
Commands.mv = function (terminal) {
    return "guest users are not permitted to move files.";
};

/* RM - remove file */
Commands.rm = function (terminal) {
    return "guest users are not permitted to remove files.";
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

/* TOUCH */
Commands.touch = function (terminal, args) {
    const target = args[0];
    return `touch: cannot touch '${target}': Permission denied`;
};

/* PWD */
Commands.pwd = function (terminal) {
    return terminal.cwd;
};

/* LS */
Commands.ls = function (terminal) {
    const node = resolvePath(terminal.cwd);
    if (!node || node.type !== "dir") {
        return "ls: not a directory";
    }
    const children = node.children || {};
    const keys = Object.keys(children);
    if (keys.length === 0) return "";
    return keys.map(name => {
        const child = children[name];
        if (child.type === "dir") {
            return `${name}/`;
        }
        return name;
    }).join("    ");
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
    return "";
};

/* CAT */
Commands.cat = function (terminal, args) {
    const target = args[0];
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
    return node.content;
};

/* MORE */
Commands.more = Commands.cat;
/* PAGER */
Commands.pager = Commands.cat;

/* TREE */
Commands.tree = function () {
    const root = window.FileSystem["~"];
    function walk(node, prefix = "") {
        let output = "";
        if (!node.children) return output;
        const keys = Object.keys(node.children);
        keys.forEach((key, index) => {
            const child = node.children[key];
            const isLast = index === keys.length - 1;
            const connector = isLast ? "└── " : "├── ";
            output += `${prefix}${connector}${key}${child.type === "dir" ? "/" : ""}\n`;
            const nextPrefix = prefix + (isLast ? "    " : "│   ");
            if (child.type === "dir") {
                output += walk(child, nextPrefix);
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
    return "";
};

/* ECHO */
Commands.echo = function (_terminal, args) {
    return args.join(" ");
};

/* HISTORY */
Commands.history = function (terminal) {
    return terminal.history.join("\n");
};

/* RESOLVE PATH HELPERS (fallback safety) (If not already defined globally)*/
if (typeof resolvePath === "undefined") {
    window.resolvePath = function (path) {
        const parts = path.replace("~", "").split("/").filter(Boolean);
        let node = window.FileSystem["~"];
        for (const part of parts) {
            if (!node.children || !node.children[part]) {
                return null;
            }
            node = node.children[part];
        }
        return node;
    };
}

if (typeof resolveRelativePath === "undefined") {
    window.resolveRelativePath = function (cwd, path) {
        if (!path) return cwd;
        if (path.startsWith("~")) return path;
        if (path.startsWith("/")) return "~" + path;
        if (path === "..") return "~";
        if (cwd === "~") return `~/${path}`;
        return `${cwd}/${path}`;
    };
}