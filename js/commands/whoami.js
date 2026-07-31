registerCommand("whoami", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        return {
            stdout: DEFAULT_USER,
            stderr: "",
            exitCode: 0
        };        
    }
});