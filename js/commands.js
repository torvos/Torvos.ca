window.Commands = {};

/* HELP */
Commands.help = function () {
    return `Torvos Terminal Commands
Navigation:
  ls              List directory contents
  cd <dir>        Change directory
  pwd             Print working directory
  tree            Show directory structure
Files:
  cat <file>      Display file contents
System:
  help            Show this help message
  clear           Clear terminal
  whoami          Show current user
  login           log into a diffrent user account
  history         Displays history of commands
  echo <text>     Displays the text on the terminal`;
};

/* SUDO */
Commands.sudo = function (terminal) {
    return "guest is not allowed to invoke sudo, this incident will be reported.";
};

/* HEAD - show first few lines of a file */

/* TAIL - show last few lines of file */

/* FIND - file files */

/* PS - list processes*/

/* KILL - kill process */

/* DF - report total, used, and available storage space */

/* FREE - display free and used memory */

/* PING */

/* CURL - download file/site */

/* WGET - download file/site */

/* FINGER - user info look up */

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