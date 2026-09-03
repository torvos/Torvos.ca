/**
 * `cd` command.
 * Changes the terminal's current working directory. With no argument,
 * goes to $HOME; with "-", goes to the previous directory ($OLDPWD).
 * Updates $PWD/$OLDPWD and re-renders the prompt on success.
 */
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
        // Print usage info and exit early when --help is passed
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: EXIT_SUCCESS
            };                
        }
        let target = args[0];

        if (!target) {
            // No argument - go home
            target = terminal.env.HOME || HOME;
        } else if (target === "-") {
            // "cd -" - go to the previous working directory
            if (!terminal.env.OLDPWD) {
                return {
                    stdout: "",
                    stderr: "cd: OLDPWD not set",
                    exitCode: EXIT_FAILURE
                };
            }
            target = terminal.env.OLDPWD;
        }

        let node = terminal.fs.get(target, terminal.cwd);
        if (!node) {
            return {
                stdout: "",
                stderr: `cd: no such file or directory: ${target}`,
                exitCode: EXIT_FAILURE
            };
        }
        if (!terminal.fs.isDirectory(node)) {
            return {
                stdout: "",
                stderr: `cd: not a directory: ${target}`,
                exitCode: EXIT_FAILURE
            };
        }
        node.accessed = Date.now();
        terminal.cwd = terminal.fs.getFullPath(target, terminal.cwd);
        terminal.renderPrompt();
        // Track OLDPWD/PWD like a real shell, so "cd -" keeps working
        terminal.env.OLDPWD = terminal.env.PWD;
        terminal.env.PWD = terminal.cwd;

        return {
            stdout: "",
            stderr: "",
            exitCode: EXIT_SUCCESS
        };
    }
});
