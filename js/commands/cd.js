registerCommand("cd", {
    name: "Change the current working directory.",
    synopsis : "cd [DIRECTORY]",
    description: "Change the shell's current working directory. If no directory is specified, the user's home directory is used.",
    options: [],
    examples: [
        "cd Documents",
        "cd ..",
        "cd -",
        "cd /"
    ],
    async execute(terminal, args, stdin) {
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        const target = args[0];
        if (!target) {
            return {
                stdout: "",
                stderr: "cd: missing operand",
                exitCode: 1
            }; 

        }
        let node = terminal.fs.get(target, terminal.cwd);
        if (!node) {
            return {
                stdout: "",
                stderr: `cd: no such file or directory: ${target}`,
                exitCode: 1
            };
        }
        if (!terminal.fs.isDirectory(node)) {
            return {
                stdout: "",
                stderr: `cd: not a directory: ${target}`,
                exitCode: 1
            };
        }
        node.accessed = Date.now();
        terminal.cwd = terminal.fs.getFullPath(target, terminal.cwd);
        terminal.renderPrompt();
        terminal.env.OLDPWD = terminal.env.PWD;
        terminal.env.PWD = terminal.cwd;

        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };
    }
});