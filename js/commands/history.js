registerCommand("history", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
            return {
            stdout: terminal.history.join("\n"),
            stderr: "",
            exitCode: 0
        };
    }
});