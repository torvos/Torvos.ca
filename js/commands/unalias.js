registerCommand("unalias", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        const target = args[0];
        if(target in terminal.aliases){
            delete terminal.aliases[target];
            return {
                stdout: "",
                stderr: "",
                exitCode: 0
            };
        }
        else{
            return {
                stdout: "",
                stderr: "unalias: alias doesn't exsist",
                exitCode: 1
            };        
        }                 
    }
});