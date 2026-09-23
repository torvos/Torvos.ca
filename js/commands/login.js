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
                exitCode: EXIT_SUCCESS
            };                
        }
        // Switch the terminal into the username-prompt input mode; the rest
        // of the (always-failing) login flow is handled in input.js's
        // handleEnter. Only do this when a real person is actually about
        // to see the "user:" prompt and type into it - i.e. NOT when this
        // command's own output is itself being consumed by something else
        // (a pipe, a redirect, or $(...) capturing it - see the comment on
        // _pipeOutputConsumed in execute.js). Switching input modes in
        // that case would silently swallow whatever the person types NEXT
        // (their real next command) as a fake username, then a fake
        // password, ending in a confusing "Login incorrect" - even though
        // they never asked to log in at all. Real login run non-
        // interactively (e.g. from a script) just fails outright instead
        // of trying to prompt anyone, which is what this falls back to.
        if (terminal._pipeOutputConsumed) {
            return {
                stdout: "",
                stderr: "login: no interactive terminal available",
                exitCode: EXIT_FAILURE
            };
        }
        terminal.inputMode = INPUT_WAIT_FOR_USERNAME;
        terminal.promptEl.textContent = "user:";
        return {
            stdout:"",
            stderr:"",
            exitCode: EXIT_SUCCESS
        };
    }
});