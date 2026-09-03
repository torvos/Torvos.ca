/**
 * `uptime` command.
 * Prints how long the current terminal session has been running, based
 * on terminal.sessionStart (set once at boot), plus a login-style summary
 * line matching the classic Unix `uptime` format.
 */
registerCommand("uptime", {
    name: "Show how long the terminal session has been running.",
    synopsis : "uptime",
    description: "is a built-in utility that reports how long the current session has been active, along with the number of logged-in users and a load-average placeholder, matching the classic Unix uptime format.",
    options: [],
    examples: [
        "uptime"
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

        const ms = Date.now() - (terminal.sessionStart ?? Date.now());
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        let uptimeText;
        if (hours > 0) {
            uptimeText = `${hours}:${String(minutes).padStart(2, "0")}`;
        } else if (minutes > 0) {
            uptimeText = `${minutes} min`;
        } else {
            uptimeText = `${seconds} sec`;
        }

        const now = new Date();
        const timeOfDay = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

        return {
            stdout: ` ${timeOfDay} up ${uptimeText},  1 user,  load average: 0.00, 0.00, 0.00`,
            stderr: "",
            exitCode: EXIT_SUCCESS
        };
    }
});
