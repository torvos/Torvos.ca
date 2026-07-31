registerCommand("reset", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {    
        return {
            stdout: "reset",
            stderr: "",
            exitCode: 0
        };                
    }  
});