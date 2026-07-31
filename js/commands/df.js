registerCommand("df", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        return {
            stdout: "",
            stderr: "guest users are not permitted view storage information.",
            exitCode: 1
        };
    }
});