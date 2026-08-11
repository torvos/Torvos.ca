/**
 * `login` command.
 * Simulated login prompt; this terminal always fails login for the guest account.
 */
registerCommand("login", {
    name: "Authenticate a user session.",
    synopsis : "login",
    description: "The specific command you use to log in depends on whether you are switching users locally, connecting remotely, or interacting with a system terminal prompt.",
    options: [],
    examples: [
        "login"
    ],
    async execute(terminal, args, stdin) {
        // Print usage info and exit early when --help is passed
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        // Switch the terminal into the username-prompt input mode; the rest
        // of the (always-failing) login flow is handled in input.js's handleEnter.
        terminal.inputMode = INPUT_WAIT_FOR_USERNAME;
        terminal.promptEl.textContent = "user:";
        return {
            stdout:"",
            stderr:"",
            exitCode:0
        };
    }
});