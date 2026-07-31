registerCommand("wget", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        return {
            stdout: "",
            stderr: "guest users are not permitted to run the wget command.",
            exitCode: 1
        };
    }
});