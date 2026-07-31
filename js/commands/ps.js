registerCommand("pw", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
            return {
            stdout: "",
            stderr: "guest users are not permitted to list processes.",
            exitCode: 1
        };
    }
});