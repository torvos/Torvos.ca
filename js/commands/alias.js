/**
 * `alias` command.
 * With no arguments, lists all defined aliases. Each remaining argument
 * is processed independently: a "NAME=COMMAND" argument defines (or
 * overwrites) that alias; a bare "NAME" argument (no "=") instead prints
 * that one alias's current definition, or reports it as unknown - real
 * bash's alias supports mixing both forms in one call (e.g.
 * "alias ll='ls -l' grep" defines ll and looks up grep), so this does too.
 */
registerCommand("alias", {
    name: "Create or display command aliases.",
    synopsis : "alias [NAME[='COMMAND']]...",
    description: "Create a new command alias or display all (or a specific) currently defined aliases. Aliases substitute one command for another before command execution, allowing shortcuts for frequently used commands.",
    options: [],
    examples: [
        "alias",
        "alias ll='ls -l'",
        "alias grep='grep --color'",
        "alias ll"
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
        if (args.length === 0) {
            // No args - list every defined alias
            const listing = Object.entries(terminal.aliases)
                .map(([name, value]) => `alias ${name}='${value}'`)
                .join("\n");
            return {
                stdout: listing,
                stderr: "",
                exitCode: EXIT_SUCCESS
            };
        }

        const stdoutLines = [];
        const stderrLines = [];
        let exitCode = EXIT_SUCCESS;

        for (const assignment of args) {
            const eq = assignment.indexOf("=");

            if (eq === -1) {
                // No "=" - show this one alias's definition instead of
                // setting anything, same as real bash's `alias NAME`.
                const name = assignment;
                if (Object.prototype.hasOwnProperty.call(terminal.aliases, name)) {
                    stdoutLines.push(`alias ${name}='${terminal.aliases[name]}'`);
                } else {
                    stderrLines.push(`alias: ${name}: not found`);
                    exitCode = EXIT_FAILURE;
                }
                continue;
            }

            if (eq === 0) {
                // "=" is the very first character - empty alias name
                stderrLines.push("alias: usage: alias NAME='COMMAND'");
                exitCode = EXIT_FAILURE;
                continue;
            }

            const name = assignment.slice(0, eq);
            const value = assignment.slice(eq + 1);
            terminal.aliases[name] = value;
        }

        return {
            stdout: stdoutLines.join("\n"),
            stderr: stderrLines.join("\n"),
            exitCode
        };
    }
});        
