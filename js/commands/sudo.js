registerCommand("sudo", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        return {
            stdout: "",
            stderr: "guest users are not allowed to invoke sudo, this incident will be reported.",
            exitCode: 1
        };
    }
});