registerCommand("help", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        return {
            stdout: `+--------------------------------------------------------------------+
    |  Welcome to Torvos.ca the following are some commands you can use  |
    |  To view the contensts of this site.                               |
    +--------------------------------------------------------------------+
    |Navigation:                                                         |
    |  ls              Lists directory contents                          |
    |  ls -l           Lists directory contents with additional details  |
    |  cd <dir>        Change directory                                  |
    |  cd ..           Go to the parent directory                        |
    +--------------------------------------------------------------------+
    |Files:                                                              |
    |  cat <file>      Display file contents, example cat readme.md      |
    |  edit <file>     Edit file contents                                |
    |  more <file>     Display file one screen at a time                 |
    +--------------------------------------------------------------------+
    |System:                                                             |
    |  help            Show this help message                            |
    |  reset           reverts terminal to original settings             |
    |  clear           Clear terminal display                            |
    +--------------------------------------------------------------------+`,
            stderr: "",
            exitCode: 0
        };
    }
});