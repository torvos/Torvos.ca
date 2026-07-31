registerCommand("printenv", {
    description: "",
    usage: "",
    execute(terminal, args, stdin) {
        let listing = "";
        for (const key in terminal.env) {
            if (terminal.env.hasOwnProperty(key)) {
            listing += `${key}: ${terminal.env[key]}\n`;
            }
        }
        
        return {
            stdout: listing.replace(/\r?\n$/, ""),
            stderr: "",
            exitCode: 0
        };        
    }
});