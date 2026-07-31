registerCommand("export", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {    
        const target = args[0];
        const value = args[1];
        if(target in terminal.env){
            return {
                stdout: "",
                stderr: "env: variable already set",
                exitCode: 1
            };
        }
        else{
            if (value !== null && value !== undefined) {
                terminal.env[target] = value;
                return {
                    stdout: "",
                    stderr: "",
                    exitCode: 0
                };               
            }
            else{
                return {
                    stdout: "",
                    stderr: "export: missing operand",
                    exitCode: 1
                };            
            }
        }
    }
});