registerCommand("unset", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        const target = args[0];
        if(target in terminal.env){
            delete terminal.env[target];
            return {
                stdout: "",
                stderr: "",
                exitCode: 0
            };
        }
        else{
            return {
                stdout: "",
                stderr: "env: variable not set",
                exitCode: 1
            };        
        }
    }
});