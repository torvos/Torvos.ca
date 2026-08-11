/**
 * `finger` command.
 * Simulated user info lookup, disabled for the guest account.
 */
registerCommand("finger", {
    name: "Display information about a user.",
    synopsis : "finger [USER] ",
    description: "A traditional user information lookup tool used to display details about system users, such as their login name, real name, terminal, idle time, and login time.",
    options: [],
    examples: [
        "finger guest",
        "finger torvos"
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
        return {
            stdout: "",
            stderr: "guest users are not permitted to run the finger command.",
            exitCode: 1
        };
    }
});