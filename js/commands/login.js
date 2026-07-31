registerCommand("login", {
    description: "Login to the terminal",
    usage: "login",
    execute(terminal) {
        terminal.inputMode = INPUT_WAIT_FOR_USERNAME;
        terminal.promptEl.textContent = "user:";
        return {
            stdout:"",
            stderr:"",
            exitCode:0
        };
    }
});