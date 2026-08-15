/**
 * `help` command.
 * Prints a static, formatted ASCII-art cheat sheet of common commands
 * (unlike `man`, this isn't per-command help - it's a fixed getting-started blurb).
 */
registerCommand("help", {
    name: "Display basic commands summary.",
    synopsis : "help",
    description: "Displays a few basic commands for users to get started.",
    options: [],
    examples: [
        "help"
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
        return {
            stdout: `+--------------------------------------------------------------------+
    |  Welcome to Torvos.ca the following are some commands you can use  |
    |  To view the contents of this site.                                |
    +--------------------------------------------------------------------+
    |Navigation:                                                         |
    |  ls               Lists directory contents                         |
    |  ls -l            Lists directory contents with additional details |
    |  cd <dir>         Change directory                                 |
    |  cd ..            Go to the parent directory                       |
    +--------------------------------------------------------------------+
    |Files:                                                              |
    |  cat <file>       Display file contents, example cat readme.md     |
    |  edit <file>      Edit file contents                               |
    |  more <file>      Display file one screen at a time                |
    +--------------------------------------------------------------------+
    |System:                                                             |
    |  man <command>    Show help for a command                          |
    |  <command> --help Show help for a command                          |
    |  help             Show this help message                           |
    |  reset            Reverts terminal to original settings            |
    |  clear            Clear terminal display                           |
    +--------------------------------------------------------------------+`,
            stderr: "",
            exitCode: 0
        };
    }
});