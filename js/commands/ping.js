registerCommand("ping", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
            return {
            stdout: "",
            stderr: "guest users are not permitted to run the ping command.",
            exitCode: 1
        };
    }
});