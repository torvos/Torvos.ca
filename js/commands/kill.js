registerCommand("kill", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
            return {
            stdout: "",
            stderr: "guest users are not permitted to kill processes.",
            exitCode: 1
        };
    }
});