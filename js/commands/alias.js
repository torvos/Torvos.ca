/**
 * `alias` command.
 * With no arguments, lists all defined aliases. With a "NAME=COMMAND"
 * argument, defines (or overwrites) an alias in terminal.aliases.
 */
registerCommand("alias", {
    name: "Create or display command aliases.",
    synopsis : "alias NAME='COMMAND'",
    description: "Create a new command alias or display all currently defined aliases. Aliases substitute one command for another before command execution, allowing shortcuts for frequently used commands.",
    options: [],
    examples: [
        "alias",
        "alias ll='ls -l'",
        "alias grep='grep --color'"
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
        if (args.length === 0) {
            // No args - list every defined alias
            const listing = Object.entries(terminal.aliases)
                .map(([name, value]) => `alias ${name}='${value}'`)
                .join("\n");
            return {
                stdout: listing,
                stderr: "",
                exitCode: 0
            };
        }

        const assignment = args[0];
        const eq = assignment.indexOf("=");

        if (eq === -1 || eq === 0) {
            // No "=" found, or it's the very first character (empty alias name)
            return {
                stdout: "",
                stderr: "alias: usage: alias NAME='COMMAND'",
                exitCode: 1
            };
        }

        const name = assignment.slice(0, eq);
        const value = assignment.slice(eq + 1);

        terminal.aliases[name] = value;

        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };
    }
});        
