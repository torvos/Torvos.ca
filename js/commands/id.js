/**
 * `id` command.
 * Prints the current user's identity (uid/gid/groups), matching the
 * real Unix `id` utility's default output and -u/-g/-n flag behavior.
 */
registerCommand("id", {
    name: "Display user identity.",
    synopsis : "id [OPTIONS]",
    description: "is a built-in utility that prints the effective user and group IDs of the current session, along with any supplementary group memberships.",
    options: [
        "-u    Print only the numeric effective user ID.",
        "-g    Print only the numeric effective group ID.",
        "-n    Print a name instead of a number (used with -u or -g)."
    ],
    examples: [
        "id",
        "id -u",
        "id -un"
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
        const parsed = terminal.parseFlags(args, { u: false, g: false, n: false });
        const uid = 1000;
        const gid = 1000;
        const user = terminal.env.USER ?? DEFAULT_USER;
        const group = terminal.env.USER ?? DEFAULT_USER;
        const showName = parsed.flags.has("n");

        if (parsed.flags.has("u")) {
            return {
                stdout: showName ? user : String(uid),
                stderr: "",
                exitCode: 0
            };
        }

        if (parsed.flags.has("g")) {
            return {
                stdout: showName ? group : String(gid),
                stderr: "",
                exitCode: 0
            };
        }

        return {
            stdout: `uid=${uid}(${user}) gid=${gid}(${group}) groups=${gid}(${group})`,
            stderr: "",
            exitCode: 0
        };
    }
});
