registerCommand("clear", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        terminal.clearScreen();
        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };
    }
});