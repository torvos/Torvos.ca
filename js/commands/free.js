registerCommand("free", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        return {
            stdout: "guest users are not permitted view memory information.",
            stderr: "",
            exitCode: 0
        };
    }
});