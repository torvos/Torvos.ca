/**
 * `sl` command.
 * The classic "you typo'd ls" novelty program: prints an ASCII train.
 * The joke only works if `sl` is a real command that catches the typo -
 * artwork below is original, not a reproduction of any existing sl tool's art.
 */
registerCommand("sl", {
    name: "Display a steam locomotive (you probably meant 'ls').",
    synopsis : "sl",
    description: "is a novelty program that punishes typos: mistype `ls` as `sl` and a little steam locomotive comes through instead of a directory listing.",
    options: [],
    examples: [
        "sl"
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

        const train = [
            "                     +--+",
            "                     |  |",
            "         ____________|__|____________________",
            "        /  ______                   ______    \\___",
            "       | |CHOO! |                 |  o   |         |",
            "       |_|______|_________________|______|_________|",
            "         (o)   (o)             (o)              (o)"
        ];

        return {
            stdout: `Did you mean 'ls'? Too late.\n\n${train.join("\n")}`,
            stderr: "",
            exitCode: EXIT_SUCCESS
        };
    }
});
