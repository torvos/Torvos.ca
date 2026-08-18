/**
 * `fortune` command.
 * Prints a random short quip from a small built-in collection (all
 * original text, not quoted from any external source).
 */
registerCommand("fortune", {
    name: "Print a random fortune.",
    synopsis : "fortune",
    description: "is a program that displays a random adage, quip, or piece of trivia each time it's run.",
    options: [],
    examples: [
        "fortune",
        "fortune | cowsay"
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

        const fortunes = [
            "There are only two hard problems in computer science: cache invalidation, naming things, and off-by-one errors.",
            "A good backup is one you've actually tried restoring.",
            "The most dangerous phrase in security is \"it's probably fine.\"",
            "Every 'temporary' fix outlives the engineer who wrote it.",
            "The best time to patch a vulnerability was yesterday. The second best time is now.",
            "Uptime is a vanity metric until the pager goes off.",
            "A firewall is only as strong as the exception someone added for testing.",
            "The cloud is just someone else's computer, and it's on-call too.",
            "You don't need more logs. You need someone reading the ones you have.",
            "Documentation is a love letter to the person who'll page you at 3am.",
            "There is no patch for a weak password.",
            "The network is never the problem, until it is.",
            "Ship it. Then watch it. Then fix it.",
            "Confidence intervals matter more than confident engineers.",
            "The shortest path to an incident is a change made on a Friday."
        ];

        const pick = fortunes[Math.floor(Math.random() * fortunes.length)];

        return {
            stdout: pick,
            stderr: "",
            exitCode: 0
        };
    }
});
