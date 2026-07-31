registerCommand("pwd", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) { 
        return {
            stdout: terminal.cwd,
            stderr: "",
            exitCode: 0
        };                  
    }
});