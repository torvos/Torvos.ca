registerCommand("echo", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        return {
            stdout: args.join(" "),
            stderr: "",
            exitCode: 0
        };
    }
});