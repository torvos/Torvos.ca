registerCommand("alias", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {    
        const target = args[0];
        const value = args[1];
        if(target in terminal.aliases){
            return {
                stdout: "",
                stderr: "alias: alias already exsists",
                exitCode: 1
            };
        }
        else{
            if (value !== null && value !== undefined) {
                terminal.aliases[target] = value;
                return {
                    stdout: "",
                    stderr: "",
                    exitCode: 0
                };        
            }
            else{
                return {
                    stdout: "",
                    stderr: "alias: missing operand",
                    exitCode: 1
                };            
            }
        }
    }
});        