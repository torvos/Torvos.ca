registerCommand("login", {
    name: "Authenticate a user session.",
    synopsis : "login",
    description: "The specific command you use to log in depends on whether you are switching users locally, connecting remotely, or interacting with a system terminal prompt.",
    options: [],
    examples: [
        "login"
    ],
    execute(terminal) {
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        terminal.inputMode = INPUT_WAIT_FOR_USERNAME;
        terminal.promptEl.textContent = "user:";
        return {
            stdout:"",
            stderr:"",
            exitCode:0
        };
    }
});