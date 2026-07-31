registerCommand("env", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {    
        const target = args[0];
        if(target in terminal.env){
            return {
                stdout: terminal.env[args[0]],
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