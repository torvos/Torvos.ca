registerCommand("curl", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        return {
            stdout: "",
            stderr: "guest users are not permitted to run the curl command.",
            exitCode: 1
        };
    }
});