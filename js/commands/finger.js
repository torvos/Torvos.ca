registerCommand("finger", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        return {
            stdout: "",
            stderr: "guest users are not permitted to run the finger command.",
            exitCode: 1
        };
    }
});